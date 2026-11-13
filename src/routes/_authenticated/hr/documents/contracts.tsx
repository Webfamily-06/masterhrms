import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  FileSignature,
  Plus,
  Calendar,
  DollarSign,
  RefreshCw,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Building2,
  UserCheck,
  Briefcase,
  Layers,
  Settings2,
  ExternalLink,
  Receipt,
  XCircle,
  FileEdit,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/contracts")({
  component: HrEmployeeContractsPage,
});

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  direct_contract: { label: "Direct Contract", color: "bg-blue-100 text-blue-800 border-blue-200" },
  vendor_outsourced: { label: "Vendor / Outsourced", color: "bg-purple-100 text-purple-800 border-purple-200" },
  consultant_freelancer: { label: "Consultant / Freelancer", color: "bg-amber-100 text-amber-800 border-amber-200" },
  temporary: { label: "Temporary Staff", color: "bg-teal-100 text-teal-800 border-teal-200" },
  intern: { label: "Intern / Trainee", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  permanent: { label: "Permanent Staff", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function HrEmployeeContractsPage() {
  const queryClient = useQueryClient();

  // Dialog Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isAmendOpen, setIsAmendOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Filters & Navigation
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [workflowFilter, setWorkflowFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Contract Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    contractNumber: "",
    contractTypeId: "",
    category: "direct_contract",
    paymentWorkflow: "PAYROLL",
    supplierId: "",
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    salary: 60000,
    hourlyRate: 0,
    billingFrequency: "monthly",
    noticePeriodDays: 30,
    autoRenew: false,
    notes: "",
  });

  // Renewal Form State
  const [renewalData, setRenewalData] = useState({
    startDate: "",
    endDate: "",
    title: "",
    contractTypeId: "",
    salary: 60000,
    hourlyRate: 0,
    billingFrequency: "monthly",
    category: "",
    paymentWorkflow: "",
    supplierId: "",
    notes: "",
  });

  // Convert to Permanent Form State
  const [convertData, setConvertData] = useState({
    salary: 60000,
    notes: "Conversion to permanent employment based on contract performance review.",
  });

  // Amend Form State
  const [amendData, setAmendData] = useState({
    endDate: "",
    salary: 60000,
    hourlyRate: 0,
    title: "",
    notes: "",
  });

  // Terminate Form State
  const [terminateData, setTerminateData] = useState({
    reason: "Contract term concluded by operational mutual agreement.",
  });

  // AP Voucher Form State (Workflow B)
  const [voucherData, setVoucherData] = useState({
    period: new Date().toISOString().slice(0, 7),
    amount: 50000,
    invoiceNumber: "",
    notes: "",
  });

  // Settings Form State
  const [settingsData, setSettingsData] = useState({
    reminderIntervals: [60, 30, 15, 7],
    notifyEmployee: true,
    notifyHR: true,
    notifyManager: true,
    escalationDays: 7,
  });

  // Queries
  const { data: overview } = useQuery({
    queryKey: ["hr-employee-contracts-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/documents/contracts/overview");
        return res.data;
      } catch (e) {
        return null;
      }
    },
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hr-employee-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contracts");
      return res.data;
    },
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: ["hr-contract-types-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["hr-vendors-picker-contracts"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/documents/contracts/vendors");
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
  });

  const { data: savedSettings } = useQuery({
    queryKey: ["hr-contracts-settings"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/documents/contracts/settings");
        return res.data;
      } catch (e) {
        return null;
      }
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/documents/contracts", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee contract issued successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        contractNumber: "",
        contractTypeId: "",
        category: "direct_contract",
        paymentWorkflow: "PAYROLL",
        supplierId: "",
        title: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        salary: 60000,
        hourlyRate: 0,
        billingFrequency: "monthly",
        noticePeriodDays: 30,
        autoRenew: false,
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create contract");
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/renew`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract renewed successfully. Predecessor contract archived.");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsRenewOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to renew contract");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/convert`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Worker successfully converted to permanent statutory employment!");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsConvertOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to convert contract");
    },
  });

  const amendMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/amend`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract amended successfully with incremented amendment number.");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsAmendOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to amend contract");
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/terminate`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract concluded and marked terminated.");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsTerminateOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to terminate contract");
    },
  });

  const voucherMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/documents/contracts/${id}/payable-voucher`, payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Accounts Payable Voucher ${data.invoiceNo} generated successfully for Vendor!`);
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsVoucherOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to generate payable voucher");
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put("/hr/documents/contracts/settings", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Contract expiry reminder configuration saved.");
      queryClient.invalidateQueries({ queryKey: ["hr-contracts-settings"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts-overview"] });
      setIsSettingsOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save settings");
    },
  });

  // Open Handlers
  const openRenewalDialog = (contract: any) => {
    setSelectedContract(contract);
    let defaultStart = new Date().toISOString().split("T")[0];
    if (contract.endDate) {
      const end = new Date(contract.endDate);
      end.setDate(end.getDate() + 1);
      defaultStart = end.toISOString().split("T")[0];
    }
    setRenewalData({
      startDate: defaultStart,
      endDate: "",
      title: `${contract.title} (Renewed)`,
      contractTypeId: contract.contractTypeId || "",
      salary: Number(contract.salary || 60000),
      hourlyRate: Number(contract.hourlyRate || 0),
      billingFrequency: contract.billingFrequency || "monthly",
      category: contract.category || "direct_contract",
      paymentWorkflow: contract.paymentWorkflow || "PAYROLL",
      supplierId: contract.supplierId || "",
      notes: `Renewal of contract ${contract.title}`,
    });
    setIsRenewOpen(true);
  };

  const openConvertDialog = (contract: any) => {
    setSelectedContract(contract);
    setConvertData({
      salary: Number(contract.salary || 60000),
      notes: "Conversion to permanent employment based on contract tenure review.",
    });
    setIsConvertOpen(true);
  };

  const openAmendDialog = (contract: any) => {
    setSelectedContract(contract);
    setAmendData({
      endDate: contract.endDate ? contract.endDate.slice(0, 10) : "",
      salary: Number(contract.salary || 0),
      hourlyRate: Number(contract.hourlyRate || 0),
      title: contract.title,
      notes: "Contract amendment for revised scope/compensation.",
    });
    setIsAmendOpen(true);
  };

  const openTerminateDialog = (contract: any) => {
    setSelectedContract(contract);
    setTerminateData({
      reason: "Contract term concluded by operational agreement.",
    });
    setIsTerminateOpen(true);
  };

  const openVoucherDialog = (contract: any) => {
    setSelectedContract(contract);
    const estAmount = contract.salary ? Number(contract.salary) : 50000;
    setVoucherData({
      period: new Date().toISOString().slice(0, 7),
      amount: estAmount,
      invoiceNumber: `INV-${contract.contractNumber || contract.id.slice(0, 8)}-${new Date().toISOString().slice(0, 7)}`,
      notes: `Service voucher for ${contract.employee?.firstName} ${contract.employee?.lastName} (${contract.title})`,
    });
    setIsVoucherOpen(true);
  };

  const openSettingsDialog = () => {
    if (savedSettings) {
      setSettingsData({
        reminderIntervals: savedSettings.reminderIntervals || [60, 30, 15, 7],
        notifyEmployee: savedSettings.notifyEmployee ?? true,
        notifyHR: savedSettings.notifyHR ?? true,
        notifyManager: savedSettings.notifyManager ?? true,
        escalationDays: savedSettings.escalationDays ?? 7,
      });
    }
    setIsSettingsOpen(true);
  };

  const now = new Date();

  // Metrics
  const totalContracts = overview?.metrics?.total ?? contracts.length;
  const activeContracts = overview?.metrics?.active ?? contracts.filter((c: any) => c.status === "active").length;
  const expiring30 = overview?.metrics?.expiring30 ?? contracts.filter((c: any) => c.stage === "30_days").length;
  const expiring60 = overview?.metrics?.expiring60 ?? contracts.filter((c: any) => c.stage === "60_days").length;
  const apContracts = overview?.byPaymentWorkflow?.accountsPayable ?? contracts.filter((c: any) => c.paymentWorkflow === "ACCOUNTS_PAYABLE").length;
  const convertedContracts = overview?.metrics?.converted ?? contracts.filter((c: any) => c.status === "converted").length;

  // Filtered List
  const filteredContracts = contracts.filter((c: any) => {
    // 1. Category Tab
    if (activeCategoryTab !== "ALL" && c.category !== activeCategoryTab) {
      return false;
    }

    // 2. Status Filter
    if (statusFilter !== "ALL") {
      if (statusFilter === "expiring") {
        if (!c.isExpiringSoon || c.status !== "active") return false;
      } else if (c.status !== statusFilter) {
        return false;
      }
    }

    // 3. Workflow Filter
    if (workflowFilter !== "ALL" && c.paymentWorkflow !== workflowFilter) {
      return false;
    }

    // 4. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchNumber = c.contractNumber?.toLowerCase().includes(q);
      const matchEmp = `${c.employee?.firstName || ""} ${c.employee?.lastName || ""} ${c.employee?.employeeCode || ""}`.toLowerCase().includes(q);
      const matchVendor = c.supplier?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchNumber && !matchEmp && !matchVendor) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Employment Lifecycle & Contract Workforce"
        description="Comprehensive administration of Direct Contracts, Vendor Personnel, Consultants, Temporary Staff & Interns with automated expiry tracking and dual settlement workflows."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openSettingsDialog} className="gap-2">
            <Settings2 className="h-4 w-4" /> Expiry Settings
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Issue Contract
          </Button>
        </div>
      </PageHeader>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Workforce Contracts"
          value={totalContracts.toString()}
          icon={<FileSignature className="h-5 w-5 text-blue-500" />}
          description="Active & historical agreements"
        />
        <StatCard
          title="Active Direct & Temp"
          value={activeContracts.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="In force on Payroll"
        />
        <StatCard
          title="Expiring (≤30 Days)"
          value={expiring30.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          description={`${expiring60} in ≤60 day window`}
        />
        <StatCard
          title="Vendor & AP Workforce"
          value={apContracts.toString()}
          icon={<Building2 className="h-5 w-5 text-purple-500" />}
          description="Workflow B (Accounts Payable)"
        />
        <StatCard
          title="Converted to Permanent"
          value={convertedContracts.toString()}
          icon={<UserCheck className="h-5 w-5 text-indigo-500" />}
          description="Transitioned to full-time staff"
        />
      </div>

      {/* MAIN CARD: CATEGORY TABS & FILTER TOOLBAR */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-4">
            {/* Category Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: `All Workforce (${contracts.length})`, icon: Layers },
                  { id: "direct_contract", label: `Direct Contracts (${overview?.byCategory?.directContract ?? 0})`, icon: Briefcase },
                  { id: "vendor_outsourced", label: `Vendor / Outsourced (${overview?.byCategory?.vendorOutsourced ?? 0})`, icon: Building2 },
                  { id: "consultant_freelancer", label: `Consultants (${overview?.byCategory?.consultantFreelancer ?? 0})`, icon: DollarSign },
                  { id: "temporary", label: `Temporary (${overview?.byCategory?.temporary ?? 0})`, icon: Clock },
                  { id: "intern", label: `Interns (${overview?.byCategory?.intern ?? 0})`, icon: UserCheck },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCategoryTab === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategoryTab(tab.id)}
                      className={`h-9 gap-1.5 text-xs font-medium ${isActive ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search and Secondary Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee, contract#, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                  <SelectTrigger className="h-9 w-44 text-xs">
                    <SelectValue placeholder="Workflow: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Payment Engines</SelectItem>
                    <SelectItem value="PAYROLL">Workflow A: Payroll</SelectItem>
                    <SelectItem value="ACCOUNTS_PAYABLE">Workflow B: Accounts Payable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract / Ref</TableHead>
                <TableHead>Worker Details</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Agency / Supplier</TableHead>
                <TableHead>Validity & Timeline</TableHead>
                <TableHead>Compensation & Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading workforce agreements...
                  </TableCell>
                </TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileSignature className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    No contract records match the active criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((c: any) => {
                  const catCfg = CATEGORY_LABELS[c.category] || CATEGORY_LABELS.direct_contract;
                  const isAP = c.paymentWorkflow === "ACCOUNTS_PAYABLE";

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/50">
                      {/* Contract / Ref */}
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{c.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                            {c.contractNumber || c.id.slice(0, 8)}
                          </span>
                          {c.amendmentNumber > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700">
                              Amend #{c.amendmentNumber}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Worker Details */}
                      <TableCell>
                        <div className="font-medium text-sm">
                          {c.employee?.firstName} {c.employee?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {c.employee?.employeeCode}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${catCfg.color}`}>
                          {catCfg.label}
                        </span>
                      </TableCell>

                      {/* Agency / Supplier */}
                      <TableCell>
                        {c.supplier ? (
                          <div>
                            <div className="text-xs font-medium text-purple-900 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-purple-600" />
                              <span>{c.supplier.name}</span>
                            </div>
                            {c.supplier.gstin && (
                              <div className="text-[11px] text-muted-foreground font-mono">
                                GST: {c.supplier.gstin}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Direct Company</span>
                        )}
                      </TableCell>

                      {/* Validity & Timeline */}
                      <TableCell>
                        <div className="text-xs text-foreground">
                          {c.startDate?.slice(0, 10)} to {c.endDate ? c.endDate.slice(0, 10) : "Indefinite"}
                        </div>
                        {c.daysRemaining !== null && c.status === "active" && (
                          <div className="mt-1">
                            {c.daysRemaining < 0 ? (
                              <span className="text-[11px] text-red-600 font-semibold">Expired</span>
                            ) : c.daysRemaining === 0 ? (
                              <span className="text-[11px] text-orange-600 font-bold">Concludes Today</span>
                            ) : c.daysRemaining <= 7 ? (
                              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                ⚠ {c.daysRemaining}d Left (Urgent)
                              </Badge>
                            ) : c.daysRemaining <= 30 ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                ⏱ {c.daysRemaining}d Left
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">{c.daysRemaining} days remaining</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Compensation & Engine */}
                      <TableCell>
                        <div className="text-xs font-medium">
                          {c.hourlyRate ? (
                            <span>₹{Number(c.hourlyRate).toLocaleString()} / hr</span>
                          ) : c.salary ? (
                            <span>₹{Number(c.salary).toLocaleString()} / mo</span>
                          ) : (
                            <span className="text-muted-foreground">Fixed Deliverable</span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          {isAP ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                              Workflow B: AP Voucher
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              Workflow A: Payroll
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {c.status === "active" ? (
                          c.isExpiringSoon ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[11px]">
                              Expiring Soon
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[11px]">
                              Active
                            </Badge>
                          )
                        ) : c.status === "renewed" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                            Renewed
                          </Badge>
                        ) : c.status === "converted" ? (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px]">
                            Converted to Perm
                          </Badge>
                        ) : c.status === "terminated" ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-[11px]">
                            Terminated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px]">
                            Expired
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRenewalDialog(c)}
                                className="h-7 text-xs px-2 gap-1 text-indigo-600 hover:text-indigo-700"
                              >
                                <RefreshCw className="h-3 w-3" /> Renew
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openConvertDialog(c)}
                                className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700"
                              >
                                <UserCheck className="h-3 w-3" /> Make Perm
                              </Button>

                              {isAP && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openVoucherDialog(c)}
                                  className="h-7 text-xs px-2 gap-1 text-purple-600 hover:text-purple-700"
                                >
                                  <Receipt className="h-3 w-3" /> AP Voucher
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openAmendDialog(c)}
                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                                title="Amend Contract"
                              >
                                <FileEdit className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openTerminateDialog(c)}
                                className="h-7 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Terminate Contract"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: ISSUE NEW CONTRACT
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Workforce Contract</DialogTitle>
            <DialogDescription>
              Create a formal contract for direct contractors, outsourced vendor staff, consultants, temporary workers, or interns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Select Worker / Employee</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee record" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Workforce Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => {
                    const isVendorOrConsultant = val === "vendor_outsourced" || val === "consultant_freelancer";
                    setFormData({
                      ...formData,
                      category: val,
                      paymentWorkflow: isVendorOrConsultant ? "ACCOUNTS_PAYABLE" : "PAYROLL",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_contract">Direct Contract Employee</SelectItem>
                    <SelectItem value="vendor_outsourced">Vendor / Outsourced Personnel</SelectItem>
                    <SelectItem value="consultant_freelancer">Consultant / Freelancer</SelectItem>
                    <SelectItem value="temporary">Temporary / Seasonal Employee</SelectItem>
                    <SelectItem value="intern">Intern / Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contract Title</Label>
                <Input
                  placeholder="e.g. Technical Consultant Agreement"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Contract Number (Auto if blank)</Label>
                <Input
                  placeholder="e.g. CNT-2026-8092"
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Vendor / Supplier Linkage if Vendor or Consultant */}
            {(formData.category === "vendor_outsourced" || formData.category === "consultant_freelancer") && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span>Vendor Agency & Accounts Payable Routing</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-purple-900">Manpower Supplier / Agency</Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(val) => setFormData({ ...formData, supplierId: val })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Choose Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} {v.gstin ? `(${v.gstin})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-purple-900">Settlement Engine</Label>
                    <Select
                      value={formData.paymentWorkflow}
                      onValueChange={(val) => setFormData({ ...formData, paymentWorkflow: val })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Workflow" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCOUNTS_PAYABLE">Workflow B: Accounts Payable (Voucher)</SelectItem>
                        <SelectItem value="PAYROLL">Workflow A: Employee Payroll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Commencement Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Conclusion Date (Optional for Indefinite)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Monthly Salary / CTC (₹)</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hourly Rate (Optional ₹)</Label>
                <Input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Billing Frequency</Label>
                <Select
                  value={formData.billingFrequency}
                  onValueChange={(val) => setFormData({ ...formData, billingFrequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="milestone">Milestone / Deliverable</SelectItem>
                    <SelectItem value="fixed">Fixed Lump Sum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Contract Terms & Notes</Label>
              <Textarea
                rows={2}
                placeholder="Scope, deliverable commitments, or notice period stipulations..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Issuing..." : "Issue Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: RENEW CONTRACT
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Workforce Contract</DialogTitle>
            <DialogDescription>
              Renew terms for {selectedContract?.employee?.firstName} {selectedContract?.employee?.lastName}. Predecessor agreement is atomically archived.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
              <strong>Predecessor Agreement:</strong> {selectedContract?.title} (
              {selectedContract?.startDate?.slice(0, 10)} to {selectedContract?.endDate?.slice(0, 10) || "Indefinite"})
            </div>

            <div className="space-y-1.5">
              <Label>Renewed Contract Title</Label>
              <Input
                value={renewalData.title}
                onChange={(e) => setRenewalData({ ...renewalData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New Start Date</Label>
                <Input
                  type="date"
                  value={renewalData.startDate}
                  onChange={(e) => setRenewalData({ ...renewalData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>New End Date</Label>
                <Input
                  type="date"
                  value={renewalData.endDate}
                  onChange={(e) => setRenewalData({ ...renewalData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Revised Salary (₹)</Label>
                <Input
                  type="number"
                  value={renewalData.salary}
                  onChange={(e) => setRenewalData({ ...renewalData, salary: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hourly Rate (₹)</Label>
                <Input
                  type="number"
                  value={renewalData.hourlyRate}
                  onChange={(e) => setRenewalData({ ...renewalData, hourlyRate: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Renewal Notes</Label>
              <Textarea
                rows={2}
                value={renewalData.notes}
                onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (selectedContract) {
                  renewMutation.mutate({ id: selectedContract.id, payload: renewalData });
                }
              }}
              disabled={!renewalData.startDate || renewMutation.isPending}
            >
              {renewMutation.isPending ? "Renewing..." : "Execute Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: CONVERT TO PERMANENT
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Permanent Employment</DialogTitle>
            <DialogDescription>
              Transition {selectedContract?.employee?.firstName} {selectedContract?.employee?.lastName} to permanent statutory headcount without duplicate employee creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200">
              <strong>Permanent Appointment Effect:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Updates employee master: <code>employmentType = 'full_time'</code></li>
                <li>Updates category: <code>employmentCategory = 'permanent'</code></li>
                <li>Clears agency affiliation and sets permanent tenure date</li>
                <li>Preserves historical contract lineage and employee ID</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label>Full-Time Monthly CTC / Salary (₹)</Label>
              <Input
                type="number"
                value={convertData.salary}
                onChange={(e) => setConvertData({ ...convertData, salary: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Appointment Notes</Label>
              <Textarea
                rows={2}
                value={convertData.notes}
                onChange={(e) => setConvertData({ ...convertData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (selectedContract) {
                  convertMutation.mutate({ id: selectedContract.id, payload: convertData });
                }
              }}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Appoint as Permanent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 4: AMEND ACTIVE CONTRACT
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isAmendOpen} onOpenChange={setIsAmendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Amend Contract Terms</DialogTitle>
            <DialogDescription>
              Revise end date, compensation, or title. Increments amendment version with audit logging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={amendData.title}
                onChange={(e) => setAmendData({ ...amendData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Revised Conclusion Date</Label>
              <Input
                type="date"
                value={amendData.endDate}
                onChange={(e) => setAmendData({ ...amendData, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Salary (₹)</Label>
                <Input
                  type="number"
                  value={amendData.salary}
                  onChange={(e) => setAmendData({ ...amendData, salary: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hourly Rate (₹)</Label>
                <Input
                  type="number"
                  value={amendData.hourlyRate}
                  onChange={(e) => setAmendData({ ...amendData, hourlyRate: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Amendment Justification</Label>
              <Textarea
                rows={2}
                value={amendData.notes}
                onChange={(e) => setAmendData({ ...amendData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAmendOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (selectedContract) {
                  amendMutation.mutate({ id: selectedContract.id, payload: amendData });
                }
              }}
              disabled={amendMutation.isPending}
            >
              {amendMutation.isPending ? "Amending..." : "Save Amendment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 5: TERMINATE CONTRACT
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>
              Conclude engagement for {selectedContract?.employee?.firstName} {selectedContract?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-900 border border-red-200">
              Contract will be marked <strong>TERMINATED</strong> and blocked from subsequent attendance punches.
            </div>

            <div className="space-y-1.5">
              <Label>Termination Reason & Remarks</Label>
              <Textarea
                rows={3}
                value={terminateData.reason}
                onChange={(e) => setTerminateData({ ...terminateData, reason: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedContract) {
                  terminateMutation.mutate({ id: selectedContract.id, payload: terminateData });
                }
              }}
              disabled={terminateMutation.isPending}
            >
              {terminateMutation.isPending ? "Terminating..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 6: ACCOUNTS PAYABLE VOUCHER (WORKFLOW B)
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Accounts Payable Voucher</DialogTitle>
            <DialogDescription>
              Workflow B: Creates a commercial AP Purchase invoice against vendor <strong>{selectedContract?.supplier?.name}</strong>. Never touches employee payroll.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Billing Period (YYYY-MM)</Label>
                <Input
                  value={voucherData.period}
                  onChange={(e) => setVoucherData({ ...voucherData, period: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Voucher Amount (₹)</Label>
                <Input
                  type="number"
                  value={voucherData.amount}
                  onChange={(e) => setVoucherData({ ...voucherData, amount: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Vendor Invoice Ref Number</Label>
              <Input
                value={voucherData.invoiceNumber}
                onChange={(e) => setVoucherData({ ...voucherData, invoiceNumber: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Service Voucher Remarks</Label>
              <Textarea
                rows={2}
                value={voucherData.notes}
                onChange={(e) => setVoucherData({ ...voucherData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoucherOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                if (selectedContract) {
                  voucherMutation.mutate({ id: selectedContract.id, payload: voucherData });
                }
              }}
              disabled={voucherMutation.isPending}
            >
              {voucherMutation.isPending ? "Generating..." : "Generate AP Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 7: EXPIRY REMINDER CONFIGURATION
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contract Expiry Automation Settings</DialogTitle>
            <DialogDescription>
              Configure tenant-level contract notification thresholds, recipients, and escalation rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reminder Intervals (Days before expiry)</Label>
              <div className="flex gap-2">
                {[60, 45, 30, 15, 7].map((days) => {
                  const isSelected = settingsData.reminderIntervals.includes(days);
                  return (
                    <Button
                      key={days}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className={`h-8 text-xs ${isSelected ? "bg-indigo-600 text-white" : ""}`}
                      onClick={() => {
                        const newIntervals = isSelected
                          ? settingsData.reminderIntervals.filter((d) => d !== days)
                          : [...settingsData.reminderIntervals, days].sort((a, b) => b - a);
                        setSettingsData({ ...settingsData, reminderIntervals: newIntervals });
                      }}
                    >
                      {days} Days
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Notification Recipient Groups</Label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsData.notifyEmployee}
                    onChange={(e) => setSettingsData({ ...settingsData, notifyEmployee: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span>Notify Contract Worker / Employee</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsData.notifyHR}
                    onChange={(e) => setSettingsData({ ...settingsData, notifyHR: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span>Notify HR Admins & Workforce Managers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsData.notifyManager}
                    onChange={(e) => setSettingsData({ ...settingsData, notifyManager: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span>Notify Reporting Manager</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <Label>Urgent Escalation Window (Days)</Label>
              <Input
                type="number"
                value={settingsData.escalationDays}
                onChange={(e) => setSettingsData({ ...settingsData, escalationDays: Number(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => settingsMutation.mutate(settingsData)}
              disabled={settingsMutation.isPending}
            >
              {settingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
