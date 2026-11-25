"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  RefreshCw,
  Trash2,
  LayoutGrid,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface ContractTypeOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface EmployeeContractItem {
  id: string;
  contractNumber: string;
  contractTypeId?: string | null;
  contractType?: { id: string; name: string } | null;
  title: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    employeeCode?: string;
    avatarUrl?: string | null;
  } | null;
  startDate: string;
  endDate?: string;
  salary: number;
  notes?: string;
  status: string;
  approvedAt?: string;
  approvedByName?: string;
  createdAt?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function computeDurationInfo(startDate?: string, endDate?: string, status?: string) {
  if (!startDate) {
    return { label: "Indefinite", range: "-", percent: 0, isExpired: false };
  }
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return { label: "-", range: startDate, percent: 0, isExpired: false };
  }
  if (!endDate) {
    return {
      label: "Permanent",
      range: `${startDate} — Present`,
      percent: 100,
      isExpired: String(status).toLowerCase() === "expired",
    };
  }
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime()) || end <= start) {
    return {
      label: "0 Months",
      range: `${startDate} — ${endDate}`,
      percent: 100,
      isExpired: true,
    };
  }

  // Human-readable years & months
  let totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate() + 15) {
    totalMonths += 1;
  }
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  let label = "";
  if (years > 0 && months > 0) {
    label = `${years} ${years === 1 ? "Year" : "Years"} ${months} ${
      months === 1 ? "Month" : "Months"
    }`;
  } else if (years > 0) {
    label = `${years} ${years === 1 ? "Year" : "Years"}`;
  } else if (months > 0) {
    label = `${months} ${months === 1 ? "Month" : "Months"}`;
  } else {
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    label = `${days} ${days === 1 ? "Day" : "Days"}`;
  }

  const now = Date.now();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now - start.getTime();
  const percent = Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
  const isExpired =
    String(status).toLowerCase() === "expired" ||
    String(status).toLowerCase() === "terminated" ||
    now > end.getTime();

  return {
    label,
    range: `${startDate} — ${endDate}`,
    percent,
    isExpired,
  };
}

function ContractStatusBadge({ status }: { status: string }) {
  const s = String(status || "active").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    expired: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    terminated: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    renewed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  };
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[s] || styles.draft
      }`}
    >
      {label}
    </span>
  );
}

export default function HrEmployeeContractsPage() {
  const queryClient = useQueryClient();
  const { formatCurrency } = useWorkspaceSettings();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "pending" | "active" | "expired" | "terminated" | "renewed"
  >("all");
  const [sortBy, setSortBy] = useState<"contractNumber" | "duration">("contractNumber");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeContractItem | null>(null);
  const [viewTarget, setViewTarget] = useState<EmployeeContractItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<EmployeeContractItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeContractItem | null>(null);

  // Form fields
  const [formEmpId, setFormEmpId] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [nextStatus, setNextStatus] = useState("active");

  const { data: contracts = [], isLoading } = useQuery<EmployeeContractItem[]>({
    queryKey: ["hr-employee-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contracts");
      return unwrapArray<EmployeeContractItem>(res);
    },
  });

  const { data: contractTypes = [] } = useQuery<ContractTypeOption[]>({
    queryKey: ["hr-contract-types-for-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/contract-types");
      return unwrapArray<ContractTypeOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-for-contracts"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      employeeId: string;
      contractTypeId?: string;
      startDate: string;
      endDate?: string;
      salary: number;
      notes?: string;
    }) => {
      if (payload.id) {
        return api.put(`/hr/documents/contracts/${payload.id}`, payload);
      }
      return api.post("/hr/documents/contracts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      toast.success(editTarget ? "Contract updated." : "Contract created.");
      setFormOpen(false);
      setEditTarget(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save contract.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/hr/documents/contracts/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      toast.success("Contract status updated.");
      setStatusTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/hr/documents/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-contracts"] });
      toast.success("Contract deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete contract.");
    },
  });

  function resetForm() {
    setFormEmpId("");
    setFormTypeId("");
    setFormStartDate("");
    setFormEndDate("");
    setFormSalary("");
    setFormNotes("");
  }

  function openAdd() {
    resetForm();
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(c: EmployeeContractItem) {
    setEditTarget(c);
    setFormEmpId(c.employeeId || c.employee?.id || "");
    setFormTypeId(c.contractTypeId || c.contractType?.id || "");
    setFormStartDate(c.startDate || "");
    setFormEndDate(c.endDate || "");
    setFormSalary(c.salary !== undefined && c.salary !== null ? String(c.salary) : "");
    setFormNotes(c.notes || "");
    setFormOpen(true);
  }

  function handleResetFilters() {
    setSearch("");
    setSelectedType("all");
    setSelectedEmployee("all");
    setActiveTab("all");
    setPage(1);
  }

  // KPI metrics
  const kpis = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let activeCount = 0;
    let nearExpireCount = 0;
    let draftCount = 0;

    for (const c of contracts) {
      const s = String(c.status || "").toLowerCase();
      if (s === "active") {
        activeCount += 1;
        if (c.endDate) {
          const endMs = new Date(c.endDate).getTime();
          if (!Number.isNaN(endMs) && endMs >= now && endMs - now <= thirtyDaysMs) {
            nearExpireCount += 1;
          }
        }
      } else if (s === "draft") {
        draftCount += 1;
      }
    }
    return { activeCount, nearExpireCount, draftCount };
  }, [contracts]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (selectedType !== "all" && c.contractTypeId !== selectedType) return false;
      if (selectedEmployee !== "all" && c.employeeId !== selectedEmployee) return false;
      if (q) {
        const empName = c.employee
          ? `${c.employee.firstName} ${c.employee.lastName}`.toLowerCase()
          : "";
        const num = (c.contractNumber || "").toLowerCase();
        const title = (c.title || c.contractType?.name || "").toLowerCase();
        const email = (c.employee?.email || "").toLowerCase();
        if (!empName.includes(q) && !num.includes(q) && !title.includes(q) && !email.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [contracts, search, selectedType, selectedEmployee]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: baseFiltered.length,
      draft: 0,
      pending: 0,
      active: 0,
      expired: 0,
      terminated: 0,
      renewed: 0,
    };
    for (const c of baseFiltered) {
      const s = String(c.status || "active").toLowerCase() as keyof typeof counts;
      if (s in counts && s !== "all") {
        counts[s] += 1;
      }
    }
    return counts;
  }, [baseFiltered]);

  const filteredAndSorted = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((c) => String(c.status || "").toLowerCase() === activeTab);

    return [...list].sort((a, b) => {
      if (sortBy === "duration") {
        const durA = a.endDate
          ? new Date(a.endDate).getTime() - new Date(a.startDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const durB = b.endDate
          ? new Date(b.endDate).getTime() - new Date(b.startDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        return sortAsc ? durA - durB : durB - durA;
      }
      const cmp = (a.contractNumber || "").localeCompare(b.contractNumber || "");
      return sortAsc ? cmp : -cmp;
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  function toggleSort(col: "contractNumber" | "duration") {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmpId || !formTypeId || !formStartDate || formSalary === "") {
      toast.error("Please fill all required fields.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      employeeId: formEmpId,
      contractTypeId: formTypeId,
      startDate: formStartDate,
      endDate: formEndDate || undefined,
      salary: Number(formSalary),
      notes: formNotes.trim() || undefined,
    });
  }

  const tabs: Array<{
    key: "all" | "draft" | "pending" | "active" | "expired" | "terminated" | "renewed";
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { key: "all", label: "All", count: tabCounts.all, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "draft", label: "Draft", count: tabCounts.draft, icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "pending", label: "Pending", count: tabCounts.pending, icon: <Clock className="h-3.5 w-3.5" /> },
    {
      key: "active",
      label: "Active",
      count: tabCounts.active,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "expired",
      label: "Expired",
      count: tabCounts.expired,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    {
      key: "terminated",
      label: "Terminated",
      count: tabCounts.terminated,
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    {
      key: "renewed",
      label: "Renewed",
      count: tabCounts.renewed,
      icon: <RotateCcw className="h-3.5 w-3.5" />,
    },
  ];

  const startIdx = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredAndSorted.length);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Employee Contracts"
        description="Manage employee contracts and monitor expiry dates."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contract
          </Button>
        }
      />

      {/* Top 3 KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Active Contract</div>
            <div className="text-2xl font-bold text-foreground">{kpis.activeCount}</div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Currently running
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Contract Near Expire</div>
            <div className="text-2xl font-bold text-foreground">{kpis.nearExpireCount}</div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Expiring within 30 days
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Draft Contract</div>
            <div className="text-2xl font-bold text-foreground">{kpis.draftCount}</div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Pending approval
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Card + Status Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedType}
            onValueChange={(v) => {
              setSelectedType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {contractTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedEmployee}
            onValueChange={(v) => {
              setSelectedEmployee(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {`${emp.firstName} ${emp.lastName}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 flex items-center gap-1 overflow-x-auto bg-card">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                  #
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("contractNumber")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase"
                  >
                    Contract Number
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Contract Name
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Assigned to
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Status
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("duration")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase"
                  >
                    Contract Duration
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Contract Amount
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading employee contracts...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    No employee contracts found.
                  </td>
                </tr>
              ) : (
                paginated.map((c, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const empName = c.employee
                    ? `${c.employee.firstName} ${c.employee.lastName}`.trim()
                    : "Unknown Employee";
                  const duration = computeDurationInfo(c.startDate, c.endDate, c.status);

                  return (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {c.contractNumber}
                      </td>
                      <td className="p-3 text-foreground">
                        {c.contractType?.name || c.title}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {c.employee?.avatarUrl ? (
                            <img
                              src={c.employee.avatarUrl}
                              alt={empName}
                              className="h-8 w-8 rounded-full object-cover border border-border/60 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center border border-primary/20 shrink-0">
                              {getInitials(empName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-xs truncate">
                              {empName}
                            </div>
                            {c.employee?.email && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {c.employee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <ContractStatusBadge status={c.status} />
                      </td>
                      <td className="p-3 min-w-[200px]">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground text-xs">
                            {duration.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {duration.range}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                duration.isExpired ? "bg-rose-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${duration.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(c.salary)}
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewTarget(c)}>
                              <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setNextStatus(c.status || "active");
                                setStatusTarget(c);
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(c)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
            <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredAndSorted.length}</span>{" "}
            results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "primary" : "outline"}
                    size="xs"
                    className={
                      pNum === safePage
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : ""
                    }
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Employee Contract Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Employee Contract" : "Add Employee Contract"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select value={formEmpId} onValueChange={setFormEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName} ${emp.lastName}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Contract Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={formTypeId} onValueChange={setFormTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Contract Type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Basic Salary <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
                placeholder="e.g. 88000"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Terms &amp; Conditions</Label>
              <Textarea
                rows={4}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Enter contract terms and conditions..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Contract Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Contract Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div className="pb-3 border-b border-border/60 flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-foreground">
                    {viewTarget.contractNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {viewTarget.contractType?.name || viewTarget.title}
                  </div>
                </div>
                <ContractStatusBadge status={viewTarget.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Employee</div>
                  <div className="font-semibold text-foreground">
                    {viewTarget.employee
                      ? `${viewTarget.employee.firstName} ${viewTarget.employee.lastName}`.trim()
                      : "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Basic Salary</div>
                  <div className="font-bold text-foreground">
                    {formatCurrency(viewTarget.salary)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.startDate || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">End Date</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.endDate || "Indefinite"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Approved At</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.approvedAt || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Approved By</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.approvedByName || "-"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Terms &amp; Conditions
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-foreground whitespace-pre-wrap">
                  {viewTarget.notes || "No terms & conditions recorded."}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewTarget(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Contract Status Modal */}
      <Dialog open={Boolean(statusTarget)} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Contract Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="renewed">Renewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusTarget &&
                  statusMutation.mutate({ id: statusTarget.id, status: nextStatus })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {statusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee Contract</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete contract{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.contractNumber}
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
