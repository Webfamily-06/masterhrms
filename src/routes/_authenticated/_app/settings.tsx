import { WorkspaceAdminSettings } from "@/components/workspace-admin-settings";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  KeyRound,
  Smartphone,
  Copy,
  Download,
  CheckCircle2,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  Clock,
  AlarmClock,
  Sliders,
  SlidersHorizontal,
  Check,
  Globe,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Users,
  Fingerprint,
  CalendarCheck,
  Receipt,
  FileSpreadsheet,
  FolderLock,
  Sparkles,
  CreditCard,
  Layers,
  ArrowRight,
  ExternalLink,
  Workflow,
  Calculator,
  FileText,
  Code,
  Play,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
  component: Settings,
  head: () => ({ meta: [{ title: "Organization & Workspace Settings — Master HRMS" }] }),
});

function Settings() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const searchParams = useSearch({ from: "/_authenticated/_app/settings" });
  const qc = useQueryClient();
  const isHR = hasRole(profile, "hr_admin") || hasRole(profile, "super_admin");

  const [activeTab, setActiveTab] = useState<string>(searchParams.tab || "organization");

  // Sync tab with URL search parameter if changed
  useEffect(() => {
    if (searchParams.tab) {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // 2FA Setup & Management Modal States
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isBackupCodesModalOpen, setIsBackupCodesModalOpen] = useState(false);

  // Setup Wizard State
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [qrData, setQrData] = useState<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTotpToken, setConfirmTotpToken] = useState("");
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Disable Modal State
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  // Organization Profile Form State
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("INR");
  const [orgTimezone, setOrgTimezone] = useState(profile?.tenant?.timezone || "Asia/Kolkata");

  const tenantId = profile?.tenant_id || "default";
  const [aiSettings, setAiSettings] = useState({
    provider: "openai",
    openaiKey: "",
    openaiModel: "gpt-4o",
    geminiKey: "",
    geminiModel: "gemini-1.5-pro",
    claudeKey: "",
    claudeModel: "claude-3-5-sonnet-20240620",
    groqKey: "",
    groqModel: "llama3-70b-8192",
    deepseekKey: "",
    deepseekModel: "deepseek-chat",
  });

  // Approval Workflows State (approval-settings.html)
  const [approvalWorkflows, setApprovalWorkflows] = useState([
    {
      id: "appr-1",
      name: "Employee Leave & PTO Requests",
      module: "Leave Management",
      levels: 2,
      tier1Role: "Direct Reporting Manager",
      tier2Role: "HR Operations Lead",
      autoApproveDays: 3,
      notifySlack: true,
      status: "Active",
    },
    {
      id: "appr-2",
      name: "Expense Reimbursement Claims (> ₹2,000)",
      module: "Finance & Expenses",
      levels: 2,
      tier1Role: "Department Head",
      tier2Role: "Finance Controller",
      autoApproveDays: 5,
      notifySlack: true,
      status: "Active",
    },
    {
      id: "appr-3",
      name: "Employee Resignation & Exit Clearance",
      module: "HR Offboarding",
      levels: 3,
      tier1Role: "Manager",
      tier2Role: "HR Business Partner",
      tier3Role: "Managing Director",
      autoApproveDays: 0,
      notifySlack: true,
      status: "Active",
    },
    {
      id: "appr-4",
      name: "Shift Swap & Overtime Authorization",
      module: "Attendance & Shifts",
      levels: 1,
      tier1Role: "Shift Supervisor",
      autoApproveDays: 1,
      notifySlack: false,
      status: "Active",
    },
  ]);

  // Salary & Statutory Formula Config (salary-settings.html)
  const [salaryConfig, setSalaryConfig] = useState({
    daPercent: "12",
    hraPercent: "40",
    pfEmployeePercent: "12",
    pfEmployerPercent: "12",
    esiEmployeePercent: "0.75",
    esiEmployerPercent: "3.25",
    professionalTax: "200",
    payslipCutoffDay: "25",
    payslipCreditDay: "01",
    overtimeHourlyMultiplier: "1.5",
    includeWeekendInSalary: true,
  });

  // Invoicing & Billing Terms (invoice-settings.html)
  const [invoiceConfig, setInvoiceConfig] = useState({
    invoicePrefix: "INV-",
    estimatePrefix: "EST-",
    dueDays: "30",
    bankName: "HDFC Bank Ltd / Silicon Valley Bank",
    accountNumber: "50200049281902",
    ifscSwift: "HDFC0000123 / SWIFT: HDFCINBB",
    taxDisplayMode: "Inclusive",
    terms: "1. Payment is due within 30 days of invoice receipt.\n2. Overdue invoices accrue a 1.5% late fee per month.",
  });

  // Custom Fields State (custom-fields.html)
  const [customFields, setCustomFields] = useState([
    { id: "cf-1", module: "Employees", label: "Emergency Blood Group", type: "Select", options: "A+, A-, B+, B-, O+, O-, AB+, AB-", required: true },
    { id: "cf-2", module: "Employees", label: "T-Shirt Size (Swag / Uniform)", type: "Select", options: "S, M, L, XL, XXL", required: false },
    { id: "cf-3", module: "Projects", label: "Client SLA Severity Tier", type: "Select", options: "Gold 24/7, Silver 12/5, Bronze Standard", required: true },
    { id: "cf-4", module: "Helpdesk", label: "Root Cause Classification", type: "Text", options: "", required: false },
  ]);
  const [isAddCustomFieldOpen, setIsAddCustomFieldOpen] = useState(false);
  const [customFieldForm, setCustomFieldForm] = useState({
    module: "Employees",
    label: "",
    type: "Text",
    options: "",
    required: false,
  });

  // Scheduled Automated Cron Jobs (cronjob.html)
  const [cronJobs, setCronJobs] = useState([
    { id: "cj-1", name: "Biometric Hardware Realtime Punch Sync", schedule: "Every 5 Minutes (*/5 * * * *)", lastRun: "2 mins ago", nextRun: "In 3 mins", status: "Active", executionTime: "1.2s" },
    { id: "cj-2", name: "Midnight Attendance Ledger Auto-Lock & Absent Tagger", schedule: "Daily at 00:01 (1 0 * * *)", lastRun: "Today at 00:01", nextRun: "Tomorrow at 00:01", status: "Active", executionTime: "4.8s" },
    { id: "cj-3", name: "Monthly Payroll Auto-Drafting & CTC Accruals", schedule: "28th of every month at 23:00 (0 23 28 * *)", lastRun: "28 Aug 2026", nextRun: "28 Sep 2026", status: "Active", executionTime: "12.4s" },
    { id: "cj-4", name: "Database & Document Vault Cloud Backup (GCS)", schedule: "Daily at 02:00 (0 2 * * *)", lastRun: "Today at 02:00", nextRun: "Tomorrow at 02:00", status: "Active", executionTime: "45.1s" },
  ]);

  const { data: savedAiSettings } = useQuery({
    queryKey: ["tenant-ai-settings-page", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-ai-keys`);
        if (page?.content) {
          setAiSettings(page.content);
          return page.content;
        }
        return null;
      } catch {
        return null;
      }
    },
  });

  const saveAiMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.put(`/cms/pages/tenant-${tenantId}-ai-keys`, {
        title: `AI Keys ${tenantId}`,
        content: payload,
        published: true,
      });
      try {
        await api.post("/ai/settings", payload);
      } catch {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-ai-settings", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant-ai-settings-page", tenantId] });
      toast.success("✨ AI & ChatGPT API settings saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save AI configuration");
    },
  });

  // Office Shift & Timing State
  const [shiftStartTime, setShiftStartTime] = useState("09:30");
  const [shiftEndTime, setShiftEndTime] = useState("18:30");
  const [shiftGraceMinutes, setShiftGraceMinutes] = useState(15);
  const [shiftHalfDayHours, setShiftHalfDayHours] = useState(4.5);
  const [shiftBreakMinutes, setShiftBreakMinutes] = useState(60);

  // Leave Type Form & Edit Modal State
  const [newLTName, setNewLTName] = useState("");
  const [newLTDays, setNewLTDays] = useState(12);
  const [newLTColor, setNewLTColor] = useState("#3B82F6");
  const [editingLT, setEditingLT] = useState<{ id: string; name: string; daysPerYear: number; color?: string } | null>(null);

  // Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDescription, setNewDeptDescription] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [editingDept, setEditingDept] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDescription, setEditDeptDescription] = useState("");

  // Load Tenant Details
  useEffect(() => {
    if (profile?.tenant) {
      setOrgName(profile.tenant.name || "");
      if (profile.tenant.timezone) setOrgTimezone(profile.tenant.timezone);
    }
  }, [profile]);

  // 2FA Status Query
  const { data: twoFactorStatus, refetch: refetch2FA } = useQuery({
    queryKey: ["two-factor-status"],
    queryFn: async () => {
      try {
        return await api.get("/auth/2fa/status");
      } catch {
        return { twoFactorEnabled: false, confirmedAt: null, remainingBackupCodesCount: 0 };
      }
    },
  });

  // Shifts Query
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-list-settings"],
    queryFn: async () => {
      try {
        const res = await api.get("/shifts");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isHR,
  });

  const activeShift = useMemo(() => {
    return shifts.find((s: any) => s.code === "GEN" || s.name?.toLowerCase().includes("general")) || shifts[0];
  }, [shifts]);

  useEffect(() => {
    if (activeShift) {
      if (activeShift.startTime) setShiftStartTime(activeShift.startTime);
      if (activeShift.endTime) setShiftEndTime(activeShift.endTime);
      if (activeShift.breakMinutes) setShiftBreakMinutes(activeShift.breakMinutes);
    }
  }, [activeShift]);

  // Save Shift Timing Mutation
  const saveShiftMut = useMutation({
    mutationFn: async () => {
      if (activeShift?.id) {
        await api.put(`/shifts/${activeShift.id}`, {
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          breakMinutes: shiftBreakMinutes,
        });
      } else {
        await api.post("/shifts", {
          name: "General Shift",
          code: "GEN",
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          breakMinutes: shiftBreakMinutes,
        });
      }
    },
    onSuccess: () => {
      toast.success("✅ Default Office Work Timing & Shift Policy updated!");
      qc.invalidateQueries({ queryKey: ["shifts-list-settings"] });
      qc.invalidateQueries({ queryKey: ["attendance-table-records"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update shift timings"),
  });

  // Save Organization Profile Mutation
  const saveOrgMut = useMutation({
    mutationFn: async () => {
      await api.put("/auth/tenant", {
        name: orgName,
        timezone: orgTimezone,
      });
    },
    onSuccess: () => {
      toast.success("✅ Organization Profile & Legal Identity updated!");
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update organization details"),
  });

  // Departments Query
  const { data: rawDepts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isHR,
  });

  const departments = rawDepts.map((d: any) => ({ ...d, id: d.id, name: d.name }));

  // Leave Types Query
  const { data: rawLT = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/types");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isHR,
  });

  const leaveTypes = rawLT.map((lt: any) => ({
    ...lt,
    id: lt.id,
    name: lt.name,
    daysPerYear: lt.daysPerYear ?? lt.days_per_year ?? 12,
    color: lt.color || "#3B82F6",
  }));

  // Leave Type Mutations
  const addLT = useMutation({
    mutationFn: async ({ name, days, color }: { name: string; days: number; color?: string }) => {
      await api.post("/leave/types", { name, daysPerYear: days, color: color || "#3B82F6" });
    },
    onSuccess: () => {
      setNewLTName("");
      setNewLTDays(12);
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("✅ Leave category added successfully!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add leave category"),
  });

  const editLT = useMutation({
    mutationFn: async ({ id, name, days, color }: { id: string; name: string; days: number; color?: string }) => {
      await api.put(`/leave/types/${id}`, { name, daysPerYear: days, color });
    },
    onSuccess: () => {
      setEditingLT(null);
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("✅ Leave category updated successfully!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update leave category"),
  });

  const delLT = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leave/types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("Leave category removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete leave category"),
  });

  // Department Mutations
  const addDept = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      await api.post("/employees/departments", { name, description });
    },
    onSuccess: () => {
      setNewDeptName("");
      setNewDeptDescription("");
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("✅ Department added successfully!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add department"),
  });

  const editDept = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      await api.put(`/employees/departments/${id}`, { name, description });
    },
    onSuccess: () => {
      setEditingDept(null);
      setEditDeptName("");
      setEditDeptDescription("");
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("✅ Department updated successfully!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update department"),
  });

  const delDept = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/departments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete department"),
  });

  // 2FA Mutations
  const generateQrMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/generate", {});
    },
    onSuccess: (data: any) => {
      setQrData(data);
      setSetupStep(1);
      setIsSetupModalOpen(true);
    },
    onError: (e: any) => toast.error(e.message || "Failed to initialize 2FA setup"),
  });

  const enable2faMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/enable", {
        password: confirmPassword,
        token: confirmTotpToken,
      });
    },
    onSuccess: (data: any) => {
      setGeneratedBackupCodes(data.backupCodes || []);
      setSetupStep(3);
      refetch2FA();
      toast.success("Two-Factor Authentication activated successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to enable 2FA. Check your password and code."),
  });

  const disable2faMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/disable", {
        password: disablePassword,
        token: disableCode,
      });
    },
    onSuccess: () => {
      setIsDisableModalOpen(false);
      setDisablePassword("");
      setDisableCode("");
      refetch2FA();
      toast.success("Two-Factor Authentication has been disabled.");
    },
    onError: (e: any) => toast.error(e.message || "Failed to disable 2FA"),
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/backup-codes/regenerate", {
        password: confirmPassword,
        token: confirmTotpToken,
      });
    },
    onSuccess: (data: any) => {
      setGeneratedBackupCodes(data.backupCodes || []);
      setIsBackupCodesModalOpen(true);
      refetch2FA();
      toast.success("New backup codes generated!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to regenerate backup codes"),
  });

  function copyToClipboard(text: string, label = "Secret Key") {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  }

  function downloadBackupCodes(codes: string[]) {
    const text = `MASTER HRMS - EMERGENCY BACKUP CODES\nAccount: ${profile?.email}\nGenerated: ${new Date().toLocaleString()}\n\nEach code can only be used once to sign in:\n\n` + codes.map((c, i) => `${i + 1}. ${c}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `master-hrms-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded.");
  }

  // HRMS Portal Configuration Hub Cards
  const HRMS_CONFIG_MODULES = [
    {
      title: "Biometric Hardware Terminals",
      description: "Manage physical ZKTeco, Face & Fingerprint devices, IP setup (10.10.10.222:4370), live sync.",
      url: "/biometric",
      icon: Fingerprint,
      badge: "Realtime TCP/IP",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    {
      title: "Shift & Rostering Policies",
      description: "Define General, Morning, Night differential shifts, break allowances & overtime eligibility.",
      url: "/shifts",
      icon: Layers,
      badge: "Workforce Shifts",
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
      title: "Leave Policy & Types",
      description: "Configure Paid Leave, Sick Leave, Casual Leave quotas, accruals, and approval hierarchies.",
      url: "/leave",
      icon: CalendarCheck,
      badge: "PTO Rules",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    {
      title: "Expense Categories & Limits",
      description: "Set approval thresholds for Travel, Food, Stationery, Equipment claims with receipts.",
      url: "/expenses",
      icon: Receipt,
      badge: "Reimbursements",
      badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    {
      title: "Custom Form Designer",
      description: "Create employee feedback forms, onboarding checklists, exit interview surveys.",
      url: "/forms",
      icon: FileSpreadsheet,
      badge: "Dynamic Schema",
      badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    {
      title: "Document Vault & Categories",
      description: "Organize Offer Letters, NDAs, Identity Proofs, Experience Certificates with e-sign off.",
      url: "/documents",
      icon: FolderLock,
      badge: "Digital Vault",
      badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    },
    {
      title: "Workplace Announcements",
      description: "Broadcast company-wide policies, holiday calendars, emergency notices & events.",
      url: "/announcements",
      icon: Sparkles,
      badge: "Broadcast Feed",
      badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    },
    {
      title: "Subscription & Billing",
      description: "Manage ERP SaaS plan tier, employee seat capacity, marketplace add-ons & invoices.",
      url: "/subscription",
      icon: CreditCard,
      badge: "Plan Tier",
      badgeColor: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Building2 className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Organization & System Settings</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Control Panel
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure default office work timings, leave categories, company profile, and HRMS portal modules.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 h-10 p-1 flex flex-wrap gap-1 w-full justify-start border">
          <TabsTrigger value="workspace" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Shield className="size-3.5 text-orange-500" />
            <span>Workspace (Roles & Modules)</span>
          </TabsTrigger>

          <TabsTrigger value="organization" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Building2 className="size-3.5 text-primary" />
            <span>Organization & Office Timing</span>
          </TabsTrigger>

          <TabsTrigger value="config-hub" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <SlidersHorizontal className="size-3.5 text-indigo-500" />
            <span>HRMS Portal Config Hub</span>
          </TabsTrigger>

          {isHR && (
            <>
              <TabsTrigger value="leave-types" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <CalendarCheck className="size-3.5 text-amber-500" />
                <span>Leave Types & Quotas</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <Users className="size-3.5 text-blue-500" />
                <span>Departments</span>
              </TabsTrigger>
            </>
          )}

          <TabsTrigger value="approvals" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Workflow className="size-3.5 text-blue-500" />
            <span>Approval Settings</span>
          </TabsTrigger>

          <TabsTrigger value="salary-settings" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Calculator className="size-3.5 text-emerald-500" />
            <span>Salary & Statutory</span>
          </TabsTrigger>

          <TabsTrigger value="invoice-settings" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <FileText className="size-3.5 text-purple-500" />
            <span>Invoice & Billing</span>
          </TabsTrigger>

          <TabsTrigger value="custom-fields" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Code className="size-3.5 text-amber-500" />
            <span>Custom Fields</span>
          </TabsTrigger>

          <TabsTrigger value="cronjobs" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Play className="size-3.5 text-rose-500" />
            <span>Cron Automations</span>
          </TabsTrigger>

          <TabsTrigger value="security" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Security & 2FA</span>
          </TabsTrigger>

          <TabsTrigger value="ai-settings" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Sparkles className="size-3.5 text-fuchsia-500" />
            <span>AI & ChatGPT Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 0: WORKSPACE ADMIN (ROLES & MODULES) ===================== */}
        <TabsContent value="workspace" className="space-y-5">
          <WorkspaceAdminSettings />
        </TabsContent>

        {/* ===================== TAB 1: ORGANIZATION & OFFICE TIMINGS ===================== */}
        <TabsContent value="organization" className="space-y-5">
          {/* Section 1: Default Office Work Timings & Shift Rules */}
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <Clock className="size-4 text-primary" />
                    <span>Default Office Work Timings & Shift Policy</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Set organization-wide official check-in time, check-out time, grace period, and half-day thresholds.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-bold">
                  Active Shift Rule
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Office In Time */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-emerald-600" /> Office In-Time (Start)
                  </Label>
                  <Input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="font-mono text-xs h-9 bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Official work commencement (e.g. 09:30 AM)
                  </span>
                </div>

                {/* Office Out Time */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-indigo-600" /> Office Out-Time (End)
                  </Label>
                  <Input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="font-mono text-xs h-9 bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Official departure time (e.g. 06:30 PM)
                  </span>
                </div>

                {/* Late Grace Period */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <AlarmClock className="size-3.5 text-amber-500" /> Late Grace Window
                  </Label>
                  <Select
                    value={String(shiftGraceMinutes)}
                    onValueChange={(v) => setShiftGraceMinutes(Number(v))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue placeholder="Grace period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 mins (Strict On-Time)</SelectItem>
                      <SelectItem value="5">5 mins grace</SelectItem>
                      <SelectItem value="10">10 mins grace</SelectItem>
                      <SelectItem value="15">15 mins grace (Up to 09:45 AM)</SelectItem>
                      <SelectItem value="30">30 mins grace (Up to 10:00 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground block">
                    Punches after this window are marked LATE
                  </span>
                </div>

                {/* Half Day Threshold */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-purple-600" /> Half-Day Min Hours
                  </Label>
                  <Select
                    value={String(shiftHalfDayHours)}
                    onValueChange={(v) => setShiftHalfDayHours(Number(v))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue placeholder="Half-day minimum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3.5">3.5 Hours minimum</SelectItem>
                      <SelectItem value="4.0">4.0 Hours minimum</SelectItem>
                      <SelectItem value="4.5">4.5 Hours minimum</SelectItem>
                      <SelectItem value="5.0">5.0 Hours minimum</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground block">
                    Work hours below this count as Half-Day
                  </span>
                </div>

                {/* Lunch / Break Duration */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-blue-500" /> Break / Lunch Allowance
                  </Label>
                  <Select
                    value={String(shiftBreakMinutes)}
                    onValueChange={(v) => setShiftBreakMinutes(Number(v))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue placeholder="Break duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Mins Lunch Break</SelectItem>
                      <SelectItem value="45">45 Mins Lunch Break</SelectItem>
                      <SelectItem value="60">60 Mins (Standard 1 Hour)</SelectItem>
                      <SelectItem value="90">90 Mins Lunch + Tea</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground block">
                    Excluded from total billable hours
                  </span>
                </div>

                {/* Standard Working Days */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="size-3.5 text-emerald-600" /> Working Days Policy
                  </Label>
                  <Input
                    disabled
                    value="Monday - Saturday (Sunday Weekly Off)"
                    className="text-xs h-9 bg-muted/40 font-semibold text-foreground cursor-not-allowed"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Sundays marked as Weekend Off in Matrix
                  </span>
                </div>
              </div>

              {/* Live Rule Summary Card */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1 text-foreground">
                <strong className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Active Attendance Rule Preview:
                </strong>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Employees punching between <strong>{shiftStartTime}</strong> and{" "}
                  <strong>
                    {(() => {
                      const [h, m] = shiftStartTime.split(":").map(Number);
                      const tot = h * 60 + m + shiftGraceMinutes;
                      return `${String(Math.floor(tot / 60)).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
                    })()}
                  </strong>{" "}
                  are tagged as <span className="font-bold text-emerald-600">Present (On-Time)</span>. Any check-in after that is tagged as <span className="font-bold text-amber-500">Late Arrival</span>. Total daily shifts target <strong>{shiftEndTime}</strong> check-out.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => saveShiftMut.mutate()}
                  disabled={saveShiftMut.isPending}
                  className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 h-8"
                >
                  <Check className="size-3.5" /> Save Office Timing Policy
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Annual Leave Quotas & PTO Policies (Embedded directly on Organization Tab) */}
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <CalendarCheck className="size-4 text-amber-500" />
                    <span>Annual Leave Categories & Quotas</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Define leave categories, yearly quota days, and color badges. Click Edit (✏️) to modify any existing leave type.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/5 font-bold">
                  {leaveTypes.length} Configured Types
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Add New Leave Type Form */}
              <div className="p-3.5 rounded-xl border bg-muted/10 space-y-3">
                <strong className="text-xs font-bold text-foreground block">
                  Add New Leave Category:
                </strong>
                <div className="flex gap-2.5 flex-wrap items-center">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Leave Type Name</Label>
                    <Input
                      placeholder="e.g. Compensatory Off / Bereavement"
                      value={newLTName}
                      onChange={(e) => setNewLTName(e.target.value)}
                      className="text-xs h-9 bg-background"
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Days / Year</Label>
                    <Input
                      type="number"
                      placeholder="12"
                      value={newLTDays}
                      onChange={(e) => setNewLTDays(Number(e.target.value))}
                      className="text-xs h-9 w-28 font-mono bg-background"
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Badge Color</Label>
                    <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-background">
                      <input
                        type="color"
                        value={newLTColor}
                        onChange={(e) => setNewLTColor(e.target.value)}
                        className="size-6 rounded border-0 cursor-pointer p-0"
                      />
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">{newLTColor}</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <Button
                      size="sm"
                      onClick={() => newLTName.trim() && addLT.mutate({ name: newLTName.trim(), days: newLTDays, color: newLTColor })}
                      disabled={!newLTName.trim() || addLT.isPending}
                      className="gap-1.5 text-xs font-bold h-9 bg-primary text-primary-foreground shadow-2xs"
                    >
                      <Plus className="size-3.5" /> Add Leave Category
                    </Button>
                  </div>
                </div>
              </div>

              {/* Leave Types Table */}
              <div className="divide-y border rounded-xl overflow-hidden">
                {leaveTypes.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground italic">
                    No leave types configured yet. Use the form above to add your first leave category.
                  </div>
                ) : (
                  leaveTypes.map((lt: any) => (
                    <div key={lt.id} className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="size-4 rounded-full border shrink-0 shadow-2xs"
                          style={{ backgroundColor: lt.color || "#3B82F6" }}
                          title={`Badge Color: ${lt.color}`}
                        />
                        <div>
                          <strong className="font-bold text-foreground text-xs block">{lt.name}</strong>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {lt.daysPerYear} days per year quota
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLT({ id: lt.id, name: lt.name, daysPerYear: lt.daysPerYear, color: lt.color || "#3B82F6" })}
                          className="h-8 px-2.5 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                          title="Edit Leave Category"
                        >
                          <Edit2 className="size-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => delLT.mutate(lt.id)}
                          disabled={delLT.isPending}
                          className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Leave Category"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Organization Profile & Regional Identity */}
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <Building2 className="size-4 text-primary" />
                    <span>Company Legal Profile & Regional Identity</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Official organization details displayed on payslips, invoices, employee contracts, and reports.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Organization Legal Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. TSV GLOBAL SOLUTIONS PVT LTD"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Workspace Identifier / Slug</Label>
                  <Input
                    disabled
                    value={profile?.tenant?.slug || "tsvhomes"}
                    className="text-xs h-9 bg-muted/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary" /> Business Contact Email
                  </Label>
                  <Input
                    value={orgEmail || profile?.email || "admin@tsvhomes.in"}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary" /> Primary Contact Phone
                  </Label>
                  <Input
                    value={orgPhone || "+91 98765 43210"}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-emerald-600" /> Default Base Currency
                  </Label>
                  <Select value={orgCurrency} onValueChange={setOrgCurrency}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹ - Indian Rupee)</SelectItem>
                      <SelectItem value="USD">USD ($ - US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (€ - Euro)</SelectItem>
                      <SelectItem value="AED">AED (د.إ - UAE Dirham)</SelectItem>
                      <SelectItem value="SGD">SGD ($ - Singapore Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-blue-500" /> System Timezone
                  </Label>
                  <Select value={orgTimezone} onValueChange={setOrgTimezone}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {typeof Intl !== "undefined" && Intl.supportedValuesOf ? (
                        Intl.supportedValuesOf("timeZone").map((tz) => {
                          let offset = "";
                          try {
                            const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
                            const tzPart = parts.find((p) => p.type === 'timeZoneName');
                            if (tzPart) offset = ` (${tzPart.value})`;
                          } catch (e) {}
                          return (
                            <SelectItem key={tz} value={tz}>
                              {tz}{offset}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+05:30)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-rose-500" /> Corporate Headquarters Address
                </Label>
                <Textarea
                  value={orgAddress || "TSV Global Towers, Tech Zone, Chennai, Tamil Nadu, India"}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  placeholder="Street, City, State, Country, Postal Code"
                  className="text-xs resize-none h-16"
                />
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => saveOrgMut.mutate()}
                  disabled={saveOrgMut.isPending}
                  className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 h-8"
                >
                  <Check className="size-3.5" /> Save Organization Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: HRMS PORTAL CONFIG HUB ===================== */}
        <TabsContent value="config-hub" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <SlidersHorizontal className="size-4 text-indigo-500" />
                    <span>HRMS Portal Module Configuration Directory</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Centralized hub to quickly jump into specific module settings, policies, hardware, and approval workflows.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {HRMS_CONFIG_MODULES.map((mod) => (
                  <Link
                    key={mod.title}
                    to={mod.url}
                    className="p-3.5 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-all group flex flex-col justify-between space-y-3 hover:border-primary/40 shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <mod.icon className="size-4" />
                          </div>
                          <strong className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {mod.title}
                          </strong>
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-mono font-bold px-1.5 py-0 border ${mod.badgeColor}`}>
                          {mod.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">
                        {mod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-end text-[11px] font-bold text-primary gap-1 group-hover:translate-x-1 transition-transform pt-1 border-t">
                      <span>Open Configuration</span>
                      <ArrowRight className="size-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: LEAVE TYPES & QUOTAS ===================== */}
        {isHR && (
          <TabsContent value="leave-types" className="space-y-4">
            <Card className="border shadow-2xs bg-card">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                      <CalendarCheck className="size-4 text-amber-500" />
                      <span>Leave Categories & Annual PTO Quotas</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Configure PTO categories, annual day allocations, and color tags. Click Edit to change existing policies.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/5 font-bold">
                    {leaveTypes.length} Total Types
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Add New Leave Type Form */}
                <div className="p-3.5 rounded-xl border bg-muted/10 space-y-3">
                  <strong className="text-xs font-bold text-foreground block">
                    Add New Leave Category:
                  </strong>
                  <div className="flex gap-2.5 flex-wrap items-center">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Leave Type Name</Label>
                      <Input
                        placeholder="e.g. Maternity / Paternity Leave"
                        value={newLTName}
                        onChange={(e) => setNewLTName(e.target.value)}
                        className="text-xs h-9 bg-background"
                      />
                    </div>

                    <div className="w-28 space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Days / Year</Label>
                      <Input
                        type="number"
                        placeholder="12"
                        value={newLTDays}
                        onChange={(e) => setNewLTDays(Number(e.target.value))}
                        className="text-xs h-9 w-28 font-mono bg-background"
                      />
                    </div>

                    <div className="w-28 space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Badge Color</Label>
                      <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-background">
                        <input
                          type="color"
                          value={newLTColor}
                          onChange={(e) => setNewLTColor(e.target.value)}
                          className="size-6 rounded border-0 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{newLTColor}</span>
                      </div>
                    </div>

                    <div className="pt-5">
                      <Button
                        size="sm"
                        onClick={() => newLTName.trim() && addLT.mutate({ name: newLTName.trim(), days: newLTDays, color: newLTColor })}
                        disabled={!newLTName.trim() || addLT.isPending}
                        className="gap-1.5 text-xs font-bold h-9 bg-primary text-primary-foreground shadow-2xs"
                      >
                        <Plus className="size-3.5" /> Add Leave Category
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Leave Types Table */}
                <div className="divide-y border rounded-xl overflow-hidden">
                  {leaveTypes.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground italic">
                      No leave types configured yet.
                    </div>
                  ) : (
                    leaveTypes.map((lt: any) => (
                      <div key={lt.id} className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-4 rounded-full border shrink-0 shadow-2xs"
                            style={{ backgroundColor: lt.color || "#3B82F6" }}
                            title={`Badge Color: ${lt.color}`}
                          />
                          <div>
                            <strong className="font-bold text-foreground text-xs block">{lt.name}</strong>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {lt.daysPerYear} days per year quota
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLT({ id: lt.id, name: lt.name, daysPerYear: lt.daysPerYear, color: lt.color || "#3B82F6" })}
                            className="h-8 px-2.5 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                            title="Edit Leave Category"
                          >
                            <Edit2 className="size-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => delLT.mutate(lt.id)}
                            disabled={delLT.isPending}
                            className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Leave Category"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===================== TAB 4: DEPARTMENTS ===================== */}
        {isHR && (
          <TabsContent value="departments" className="space-y-4">
            {/* Edit Department Dialog */}
            <Dialog open={!!editingDept} onOpenChange={(open) => { if (!open) { setEditingDept(null); setEditDeptName(""); setEditDeptDescription(""); } }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm font-black">
                    <Edit2 className="size-4 text-blue-500" /> Edit Department
                  </DialogTitle>
                  <DialogDescription className="text-xs">Update the department name and description.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Department Name <span className="text-rose-500">*</span></Label>
                    <Input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} placeholder="e.g. Engineering" className="text-xs h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea value={editDeptDescription} onChange={(e) => setEditDeptDescription(e.target.value)} placeholder="Brief description of this department function" className="text-xs resize-none" rows={2} />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { setEditingDept(null); setEditDeptName(""); setEditDeptDescription(""); }}>Cancel</Button>
                  <Button size="sm" className="text-xs h-8 bg-primary text-primary-foreground font-bold gap-1.5" disabled={!editDeptName.trim() || editDept.isPending} onClick={() => editingDept && editDept.mutate({ id: editingDept.id, name: editDeptName, description: editDeptDescription })}>
                    <Check className="size-3.5" /> {editDept.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="border shadow-2xs bg-card">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                      <Users className="size-4 text-blue-500" />
                      <span>Departments &amp; Team Directories</span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-blue-400/50 text-blue-600 bg-blue-50 dark:bg-blue-900/20">{departments.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">Create, rename, and manage organizational business units. Each department tracks its employee headcount.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 dark:bg-blue-900/10 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Add New Department</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input placeholder="Department name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newDeptName.trim()) addDept.mutate({ name: newDeptName.trim(), description: newDeptDescription.trim() || undefined }); }} className="text-xs h-8 flex-1" />
                    <Input placeholder="Description (optional)" value={newDeptDescription} onChange={(e) => setNewDeptDescription(e.target.value)} className="text-xs h-8 flex-1" />
                    <Button size="sm" onClick={() => newDeptName.trim() && addDept.mutate({ name: newDeptName.trim(), description: newDeptDescription.trim() || undefined })} disabled={!newDeptName.trim() || addDept.isPending} className="gap-1.5 text-xs font-bold h-8 bg-primary text-primary-foreground shrink-0">
                      <Plus className="size-3.5" /> {addDept.isPending ? "Adding..." : "Add Department"}
                    </Button>
                  </div>
                </div>
                {departments.length > 4 && (
                  <Input placeholder="Search departments..." value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} className="text-xs h-8 max-w-xs" />
                )}
                <div className="divide-y border rounded-xl overflow-hidden">
                  {departments.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Building2 className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="text-muted-foreground italic text-xs">No departments configured yet. Add your first department above.</p>
                    </div>
                  ) : (
                    departments.filter((dept: any) => !deptSearch || dept.name.toLowerCase().includes(deptSearch.toLowerCase())).map((dept: any) => (
                      <div key={dept.id} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Briefcase className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-xs leading-tight truncate">{dept.name}</p>
                            {dept.description && <p className="text-[11px] text-muted-foreground truncate">{dept.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            {dept._count?.employees ?? 0} emp{dept._count?.employees !== 1 ? "s" : ""}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingDept(dept); setEditDeptName(dept.name); setEditDeptDescription(dept.description || ""); }} className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit department">
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => delDept.mutate(dept.id)} disabled={delDept.isPending} className="h-7 w-7 p-0 text-rose-400 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete department">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {departments.length > 0 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">{departments.length} department{departments.length !== 1 ? "s" : ""} &middot; {departments.reduce((sum: number, d: any) => sum + (d._count?.employees ?? 0), 0)} total employees</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===================== TAB 5: SECURITY & 2FA ===================== */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3.5 px-5 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span>Two-Factor Authentication (Email OTP)</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Protect your enterprise account with a mandatory 6-digit verification code sent to your registered email on every sign-in.
                  </CardDescription>
                </div>

                <Badge
                  variant="outline"
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 ${
                    twoFactorStatus?.twoFactorEnabled
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  }`}
                >
                  {twoFactorStatus?.twoFactorEnabled ? "● Enabled" : "○ Not Configured"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5 text-xs">
              {twoFactorStatus?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-start gap-3.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="font-bold text-foreground text-xs block">
                        Email OTP Authentication Active & Enforced
                      </strong>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Your account requires a 6-digit verification code every time you sign in. This ensures that unauthorized access is blocked even if your password is compromised.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Verification Method
                      </span>
                      <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                        <Mail className="size-3.5 text-primary" />
                        <span>Email OTP (6-digit numeric)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Registered Email
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-foreground text-xs">
                        <span>{twoFactorStatus?.maskedEmail || profile?.email || "••••@company.com"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <Link to="/setup-notes">
                      <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 h-8">
                        <HelpCircle className="size-3.5 text-primary" />
                        <span>View 2FA Setup & Login Guide</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-xl">
                  <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 flex items-start gap-3.5">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="font-bold text-foreground text-xs block">
                        Security Setup Required
                      </strong>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Protect your account with email verification. A 6-digit OTP will be sent to your registered email address every time you sign in.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Registered Delivery Destination
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground text-xs">
                      <Mail className="size-3.5 text-primary" />
                      <span>{twoFactorStatus?.maskedEmail || profile?.email || "••••@company.com"}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <Link to="/setup-notes">
                      <Button size="sm" className="bg-primary text-primary-foreground font-bold text-xs h-8 gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        <span>Read 2FA Setup Guide</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: AI & CHATGPT MULTI-MODEL SETTINGS ===================== */}
        <TabsContent value="ai-settings" className="space-y-5">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Sparkles className="size-4 text-fuchsia-500 animate-pulse" />
                  <span>AI & Multi-Model ChatGPT Configuration</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Configure OpenAI ChatGPT, Google Gemini, Anthropic Claude, Groq Llama-3, and DeepSeek API keys for 1-click generation across all ERP modules.
                </CardDescription>
              </div>
              <Link to="/ai-writer">
                <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 h-8">
                  <ExternalLink className="size-3.5" /> Open AI Studio
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Default AI Engine Provider</Label>
                <Select
                  value={aiSettings.provider}
                  onValueChange={(val) => setAiSettings({ ...aiSettings, provider: val })}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai" className="text-xs">🤖 OpenAI (ChatGPT GPT-4o / GPT-4o-mini)</SelectItem>
                    <SelectItem value="gemini" className="text-xs">✨ Google Gemini (Gemini 1.5 Pro / Flash)</SelectItem>
                    <SelectItem value="claude" className="text-xs">🧠 Anthropic Claude (Claude 3.5 Sonnet)</SelectItem>
                    <SelectItem value="groq" className="text-xs">⚡ Groq (Llama 3.1 70B Ultra-Fast)</SelectItem>
                    <SelectItem value="deepseek" className="text-xs">🔬 DeepSeek AI (DeepSeek-V2 / Coder)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 1. OpenAI / ChatGPT */}
              <div className="p-3.5 rounded-xl border bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    🤖 OpenAI / ChatGPT Key & Model
                  </span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">OpenAI Secret API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-proj-..."
                      value={aiSettings.openaiKey}
                      onChange={(e) => setAiSettings({ ...aiSettings, openaiKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">ChatGPT Model</Label>
                    <Select
                      value={aiSettings.openaiModel}
                      onValueChange={(val) => setAiSettings({ ...aiSettings, openaiModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o" className="text-xs">gpt-4o (Omni Flagship)</SelectItem>
                        <SelectItem value="gpt-4o-mini" className="text-xs">gpt-4o-mini (Fast & Affordable)</SelectItem>
                        <SelectItem value="gpt-4-turbo" className="text-xs">gpt-4-turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo" className="text-xs">gpt-3.5-turbo</SelectItem>
                        <SelectItem value="o1-preview" className="text-xs">o1-preview (Advanced Reasoning)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 2. Google Gemini */}
              <div className="p-3.5 rounded-xl border bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    ✨ Google Gemini Key & Model
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Google AI Studio <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Gemini API Key</Label>
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={aiSettings.geminiKey}
                      onChange={(e) => setAiSettings({ ...aiSettings, geminiKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Gemini Model</Label>
                    <Select
                      value={aiSettings.geminiModel}
                      onValueChange={(val) => setAiSettings({ ...aiSettings, geminiModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-1.5-pro" className="text-xs">gemini-1.5-pro (Complex reasoning)</SelectItem>
                        <SelectItem value="gemini-1.5-flash" className="text-xs">gemini-1.5-flash (Ultra fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. Anthropic Claude */}
              <div className="p-3.5 rounded-xl border bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    🧠 Anthropic Claude Key & Model
                  </span>
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Anthropic Console <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Claude API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-ant-api..."
                      value={aiSettings.claudeKey}
                      onChange={(e) => setAiSettings({ ...aiSettings, claudeKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Claude Model</Label>
                    <Select
                      value={aiSettings.claudeModel}
                      onValueChange={(val) => setAiSettings({ ...aiSettings, claudeModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-3-5-sonnet-20240620" className="text-xs">claude-3-5-sonnet (Smartest)</SelectItem>
                        <SelectItem value="claude-3-haiku-20240307" className="text-xs">claude-3-haiku (Fast & light)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Save Controls */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => saveAiMutation.mutate(aiSettings)}
                  disabled={saveAiMutation.isPending}
                  className="font-bold text-xs h-9 gap-1.5 text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <Check className="size-3.5" /> Save AI API Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: APPROVAL SETTINGS (approval-settings.html) ===================== */}
        <TabsContent value="approvals" className="space-y-4">
          <Card className="border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Workflow className="size-4 text-blue-500" /> Multi-Tier Approval Workflows
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure approval hierarchies, escalation timeouts, and auto-approval rules for organizational requests.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvalWorkflows.map((w) => (
                  <div key={w.id} className="p-4 rounded-xl border bg-card space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-foreground">{w.name}</div>
                        <div className="text-[11px] text-muted-foreground">{w.module}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold">
                        {w.levels}-Tier Chain
                      </Badge>
                    </div>

                    <div className="space-y-2 p-3 rounded-lg bg-muted/20 border">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground">Tier 1 Reviewer:</span>
                        <span className="font-bold text-foreground">{w.tier1Role}</span>
                      </div>
                      {w.tier2Role && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-muted-foreground">Tier 2 Final Approver:</span>
                          <span className="font-bold text-foreground">{w.tier2Role}</span>
                        </div>
                      )}
                      {w.tier3Role && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-muted-foreground">Executive Clearance:</span>
                          <span className="font-bold text-foreground">{w.tier3Role}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded border bg-background">
                        <span className="text-[10px] text-muted-foreground block">Auto-Pass SLA</span>
                        <span className="font-bold">{w.autoApproveDays > 0 ? `${w.autoApproveDays} Business Days` : "No Auto-Pass"}</span>
                      </div>
                      <div className="p-2 rounded border bg-background">
                        <span className="text-[10px] text-muted-foreground block">Instant Alerts</span>
                        <span className="font-bold text-emerald-600">{w.notifySlack ? "Slack & Email" : "Email Only"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" onClick={() => toast.success("✅ Approval workflows updated successfully!")} className="text-xs font-bold gap-1.5">
                  <Check className="size-3.5" /> Save Workflow Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 7: SALARY & STATUTORY SETTINGS (salary-settings.html) ===================== */}
        <TabsContent value="salary-settings" className="space-y-4">
          <Card className="border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Calculator className="size-4 text-emerald-500" /> Salary Allowances & Statutory Formula Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure default percentage components for Dearness Allowance, HRA, Provident Fund, and ESI.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">Dearness Allowance (DA % of Basic)</Label>
                  <Input
                    type="number"
                    value={salaryConfig.daPercent}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, daPercent: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">Standard 10% - 15%</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">House Rent Allowance (HRA % of Basic)</Label>
                  <Input
                    type="number"
                    value={salaryConfig.hraPercent}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, hraPercent: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">Metro: 50%, Non-Metro: 40%</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">Employee PF Withholding (%)</Label>
                  <Input
                    type="number"
                    value={salaryConfig.pfEmployeePercent}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, pfEmployeePercent: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">Statutory PF Deduction (12.0%)</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">Employer PF Matching (%)</Label>
                  <Input
                    type="number"
                    value={salaryConfig.pfEmployerPercent}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, pfEmployerPercent: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">Organization matching share (12.0%)</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">Monthly Professional Tax (Fixed ₹)</Label>
                  <Input
                    type="number"
                    value={salaryConfig.professionalTax}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, professionalTax: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">Standard ₹200 / month</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-bold text-foreground">Overtime Hourly Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={salaryConfig.overtimeHourlyMultiplier}
                    onChange={(e) => setSalaryConfig({ ...salaryConfig, overtimeHourlyMultiplier: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground">1.5x regular hourly wage</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" onClick={() => toast.success("✅ Salary & statutory rules saved!")} className="text-xs font-bold gap-1.5">
                  <Check className="size-3.5" /> Save Salary Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 8: INVOICE & BILLING SETTINGS (invoice-settings.html) ===================== */}
        <TabsContent value="invoice-settings" className="space-y-4">
          <Card className="border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <FileText className="size-4 text-purple-500" /> Invoicing, Billing & Bank Wire Credentials
                </CardTitle>
                <CardDescription className="text-xs">
                  Customize invoice prefixes, payment grace periods, bank transfer accounts, and default terms.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Invoice Sequence Prefix</Label>
                  <Input
                    value={invoiceConfig.invoicePrefix}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoicePrefix: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Estimate Sequence Prefix</Label>
                  <Input
                    value={invoiceConfig.estimatePrefix}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, estimatePrefix: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Standard Due Days</Label>
                  <Input
                    type="number"
                    value={invoiceConfig.dueDays}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, dueDays: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl border bg-muted/10">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Beneficiary Bank Name</Label>
                  <Input
                    value={invoiceConfig.bankName}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, bankName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Bank Account Number</Label>
                  <Input
                    value={invoiceConfig.accountNumber}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, accountNumber: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">IFSC / SWIFT Code</Label>
                  <Input
                    value={invoiceConfig.ifscSwift}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, ifscSwift: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Standard Invoice Terms & Conditions</Label>
                <Textarea
                  rows={3}
                  value={invoiceConfig.terms}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, terms: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" onClick={() => toast.success("✅ Invoicing & billing settings updated!")} className="text-xs font-bold gap-1.5">
                  <Check className="size-3.5" /> Save Invoice Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 9: CUSTOM FIELDS (custom-fields.html) ===================== */}
        <TabsContent value="custom-fields" className="space-y-4">
          <Card className="border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Code className="size-4 text-amber-500" /> Dynamic Custom Fields Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Extend entity schemas dynamically across Employees, Projects, Clients, and Helpdesk Tickets.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddCustomFieldOpen(true)} className="h-8 text-xs font-bold gap-1.5 shadow-2xs">
                <Plus className="size-3.5" /> Add Custom Field
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="p-3">Target Module</th>
                    <th className="p-3">Field Label</th>
                    <th className="p-3">Data Type</th>
                    <th className="p-3">Options / Schema</th>
                    <th className="p-3">Mandatory</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customFields.map((cf) => (
                    <tr key={cf.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                          {cf.module}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-foreground">{cf.label}</td>
                      <td className="p-3 font-mono text-muted-foreground">{cf.type}</td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">{cf.options || "—"}</td>
                      <td className="p-3">
                        {cf.required ? (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Optional
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove custom field "${cf.label}"?`)) {
                              setCustomFields(customFields.filter((item) => item.id !== cf.id));
                              toast.success("Custom field removed.");
                            }
                          }}
                          className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 10: CRON JOBS & AUTOMATION (cronjob.html) ===================== */}
        <TabsContent value="cronjobs" className="space-y-4">
          <Card className="border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Play className="size-4 text-rose-500" /> Scheduled Background Automations (Cron System)
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated background sync runners for attendance capture, midnight ledger lock, and payroll generation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cronJobs.map((job) => (
                  <div key={job.id} className="p-4 rounded-xl border bg-card space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground">{job.name}</div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                        {job.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono text-muted-foreground p-2 rounded bg-muted/20 border">
                      <div>Cron: <span className="font-bold text-foreground">{job.schedule}</span></div>
                      <div>Last Run: <span className="text-foreground">{job.lastRun} ({job.executionTime})</span></div>
                      <div>Next Execution: <span className="text-primary font-bold">{job.nextRun}</span></div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.success(`⚡ Manual trigger dispatched for "${job.name}"! Executed in ${job.executionTime}`);
                        }}
                        className="h-7 text-xs font-bold gap-1.5 shadow-2xs"
                      >
                        <Play className="size-3 text-primary" /> Trigger Now (Manual)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== EDIT LEAVE TYPE MODAL ===== */}
      <Dialog open={!!editingLT} onOpenChange={(o) => !o && setEditingLT(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <CalendarCheck className="size-5 text-amber-500" /> Edit Leave Category Policy
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify leave type name, annual day entitlement quota, and display badge color.
            </DialogDescription>
          </DialogHeader>

          {editingLT && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Leave Type Name</Label>
                <Input
                  value={editingLT.name}
                  onChange={(e) => setEditingLT({ ...editingLT, name: e.target.value })}
                  placeholder="e.g. Annual Vacation Leave"
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Days / Year (Quota)</Label>
                  <Input
                    type="number"
                    value={editingLT.daysPerYear}
                    onChange={(e) => setEditingLT({ ...editingLT, daysPerYear: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Badge Color</Label>
                  <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-background">
                    <input
                      type="color"
                      value={editingLT.color || "#3B82F6"}
                      onChange={(e) => setEditingLT({ ...editingLT, color: e.target.value })}
                      className="size-6 rounded border-0 cursor-pointer p-0"
                    />
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{editingLT.color || "#3B82F6"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setEditingLT(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingLT && editingLT.name.trim()) {
                  editLT.mutate({
                    id: editingLT.id,
                    name: editingLT.name.trim(),
                    days: editingLT.daysPerYear,
                    color: editingLT.color,
                  });
                }
              }}
              disabled={editLT.isPending || !editingLT?.name.trim()}
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Check className="size-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 2FA Setup Modal ===== */}
      <Dialog open={isSetupModalOpen} onOpenChange={setIsSetupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Shield className="size-5 text-primary" /> Setup Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>

          {setupStep === 1 && qrData && (
            <div className="space-y-4 py-2 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Scan this QR code with Google Authenticator, Microsoft Authenticator, or Authy:
              </p>
              <div className="p-3 bg-white rounded-xl border grid place-items-center w-fit mx-auto shadow-2xs">
                <img src={qrData.qrCodeDataUrl} alt="2FA QR Code" className="size-44"  loading="lazy"/>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 font-mono text-[11px] flex items-center justify-between border">
                <span className="truncate">{qrData.secret}</span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(qrData.secret)} className="h-6 px-2 text-xs">
                  <Copy className="size-3" />
                </Button>
              </div>
              <DialogFooter className="pt-2">
                <Button size="sm" onClick={() => setSetupStep(2)} className="w-full text-xs font-bold">
                  Next Step →
                </Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Account Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">6-Digit Authenticator Code</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={confirmTotpToken}
                  onChange={(e) => setConfirmTotpToken(e.target.value)}
                  placeholder="000000"
                  className="text-xs font-mono text-center tracking-widest text-base font-bold h-10"
                />
              </div>
              <DialogFooter className="pt-2 flex justify-between">
                <Button size="sm" variant="outline" onClick={() => setSetupStep(1)} className="text-xs">
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => enable2faMutation.mutate()}
                  disabled={enable2faMutation.isPending || !confirmPassword || confirmTotpToken.length !== 6}
                  className="text-xs font-bold bg-primary"
                >
                  Verify & Activate
                </Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 3 && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 space-y-1">
                <strong className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" /> 2FA Successfully Enabled!
                </strong>
                <p className="text-[11px]">Save these emergency backup codes in a secure location.</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-lg bg-muted/40 border font-mono text-[11px]">
                {generatedBackupCodes.map((code, idx) => (
                  <div key={idx} className="p-1 bg-background rounded border text-center font-bold">
                    {code}
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadBackupCodes(generatedBackupCodes)} className="w-full text-xs font-bold gap-1.5">
                <Download className="size-3.5" /> Download Backup Codes (.txt)
              </Button>
              <DialogFooter className="pt-2">
                <Button size="sm" onClick={() => setIsSetupModalOpen(false)} className="w-full text-xs font-bold">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 2FA Disable Modal ===== */}
      <Dialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="size-5" /> Disable 2FA Protection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Confirm Account Password</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter password"
                className="text-xs h-8"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsDisableModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => disable2faMutation.mutate()}
              disabled={disable2faMutation.isPending || !disablePassword}
              className="text-xs font-bold"
            >
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Custom Field Modal (custom-fields.html) ===== */}
      <Dialog open={isAddCustomFieldOpen} onOpenChange={setIsAddCustomFieldOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code className="size-5 text-amber-500" />
              <span>Create Dynamic Custom Field</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Extend data models for Employees, Projects, Clients, or Helpdesk Tickets.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCustomFields([
                ...customFields,
                {
                  id: "cf-" + Date.now(),
                  module: customFieldForm.module,
                  label: customFieldForm.label,
                  type: customFieldForm.type,
                  options: customFieldForm.options,
                  required: customFieldForm.required,
                },
              ]);
              setIsAddCustomFieldOpen(false);
              setCustomFieldForm({ module: "Employees", label: "", type: "Text", options: "", required: false });
              toast.success(`Custom field "${customFieldForm.label}" added to ${customFieldForm.module}!`);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Entity Module *</Label>
              <Select
                value={customFieldForm.module}
                onValueChange={(v) => setCustomFieldForm({ ...customFieldForm, module: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employees">Employees</SelectItem>
                  <SelectItem value="Projects">Projects</SelectItem>
                  <SelectItem value="Clients">Clients & CRM</SelectItem>
                  <SelectItem value="Helpdesk">Helpdesk Tickets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Field Label / Title *</Label>
              <Input
                required
                placeholder="e.g. Emergency Blood Group / SLA Tier"
                value={customFieldForm.label}
                onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Field Data Type *</Label>
              <Select
                value={customFieldForm.type}
                onValueChange={(v) => setCustomFieldForm({ ...customFieldForm, type: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Single-line Text</SelectItem>
                  <SelectItem value="Number">Numeric Value</SelectItem>
                  <SelectItem value="Select">Dropdown Select</SelectItem>
                  <SelectItem value="Date">Date Picker</SelectItem>
                  <SelectItem value="Checkbox">Checkbox (Boolean)</SelectItem>
                  <SelectItem value="Textarea">Multi-line Textarea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {customFieldForm.type === "Select" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Comma-Separated Dropdown Options</Label>
                <Input
                  placeholder="Option 1, Option 2, Option 3"
                  value={customFieldForm.options}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, options: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="cfReq"
                checked={customFieldForm.required}
                onChange={(e) => setCustomFieldForm({ ...customFieldForm, required: e.target.checked })}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="cfReq" className="text-xs font-medium cursor-pointer">
                Mandatory Field (Required on Save)
              </Label>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddCustomFieldOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold">
                Save Custom Field
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
