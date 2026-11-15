import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  uploadLeaveSupportingDocument,
  invalidateEncashmentCompOff,
} from "@/lib/leave-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Search,
  Coins,
  Banknote,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  SquarePen,
  Ban,
  Paperclip,
  Users,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type EssTab = "encashments" | "comp-offs" | "eligibility" | "team";

function formatCurrencyDynamic(amount: number | string | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = Number(amount);
  if (Number.isNaN(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currencyCode || ""} ${num.toFixed(2)}`.trim();
  }
}

function formatDateDisplay(dateVal?: string | null): string {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return String(dateVal).slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getStatusBadgeClasses(status?: string): string {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "PAID", "ACTIVE", "CONSUMED"].includes(s)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (["PENDING", "MANAGER_APPROVED", "HR_APPROVED", "PAYROLL_PENDING", "PAYROLL_PROCESSING"].includes(s)) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }
  if (["REJECTED", "FAILED", "EXPIRED"].includes(s)) {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

function formatStatusLabel(status?: string): string {
  if (!status) return "Unknown";
  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute("/_authenticated/me/leave/encashment-compoff")({
  component: MeLeaveEncashmentCompOffPage,
  head: () => ({ meta: [{ title: "My Leave Encashment & Comp-Off — Master HRMS" }] }),
});

export default function MeLeaveEncashmentCompOffPage() {
  const queryClient = useQueryClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<EssTab>("encashments");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // Modals
  const [encashModalOpen, setEncashModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [compOffModalOpen, setCompOffModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [teamDecisionTarget, setTeamDecisionTarget] = useState<{
    record: any;
    action: "approve" | "reject";
  } | null>(null);
  const [teamDecisionNote, setTeamDecisionNote] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Forms
  const [encashForm, setEncashForm] = useState({
    leaveTypeId: "",
    requestedDays: "1",
    effectiveDate: todayIso,
    reason: "",
    attachmentUrl: "",
  });
  const [encashPreview, setEncashPreview] = useState<any | null>(null);
  const [isEncashPreviewLoading, setIsEncashPreviewLoading] = useState(false);

  const [compOffForm, setCompOffForm] = useState({
    workedOnDate: todayIso,
    workType: "WEEKLY_OFF",
    actualHoursWorked: "",
    requestedDays: "",
    reason: "",
    attachmentUrl: "",
  });
  const [compOffPreview, setCompOffPreview] = useState<any | null>(null);
  const [isCompOffPreviewLoading, setIsCompOffPreviewLoading] = useState(false);

  // 1. ESS Overview Query (Comp-Off balance, Expiring lots, Eligible encashment types, ESS policy flags, Manager direct-reports count)
  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["me-encashment-compoff-overview"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/encashment-compoff/overview");
      return unwrapData<any>(res);
    },
    staleTime: 20_000,
  });

  const currencyCode = overview?.currency || "INR";
  const eligibleEncashTypes: any[] = Array.isArray(overview?.encashment?.eligibleLeaveTypes)
    ? overview.encashment.eligibleLeaveTypes
    : [];
  const activeCompOffLots: any[] = Array.isArray(overview?.compOff?.lots)
    ? overview.compOff.lots
    : [];
  const expiringLots: any[] = Array.isArray(overview?.compOff?.expiringSoonLots)
    ? overview.compOff.expiringSoonLots
    : [];
  const directReportsCount = Number(overview?.directReportsCount || 0);
  const essEncashAllowed = overview?.essPolicy?.encashmentAllowed !== false;
  const essCompOffAllowed = overview?.essPolicy?.compOffAllowed !== false;

  // 2. My Requests Query
  const {
    data: myRequestsPayload,
    isLoading: isRequestsLoading,
    isFetching: isRequestsFetching,
    refetch: refetchMyRequests,
  } = useQuery({
    queryKey: [
      "me-encashment-compoff",
      activeTab,
      statusFilter,
      debouncedSearch,
      page,
      limit,
    ],
    queryFn: async () => {
      return await api.get("/api/v1/me/leave/encashment-compoff", {
        params: {
          type: activeTab === "comp-offs" ? "COMP_OFF" : "ENCASHMENT",
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: debouncedSearch || undefined,
          page,
          limit,
        },
      });
    },
    enabled: activeTab === "encashments" || activeTab === "comp-offs",
    staleTime: 15_000,
  });

  const myRows: any[] = Array.isArray(myRequestsPayload?.data)
    ? myRequestsPayload.data
    : unwrapArray(myRequestsPayload);
  const myPagination = myRequestsPayload?.pagination || {
    page,
    limit,
    total: myRows.length,
    totalPages: 1,
  };

  // 3. Team Direct-Report Requests Query (for Reporting Managers)
  const {
    data: teamPayload,
    isLoading: isTeamLoading,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["me-team-encashment-compoff", statusFilter, page, limit],
    queryFn: async () => {
      return await api.get("/api/v1/me/leave/team-encashment-compoff", {
        params: {
          status: statusFilter !== "all" ? statusFilter : undefined,
          page,
          limit,
        },
      });
    },
    enabled: activeTab === "team",
  });

  const teamRows: any[] = Array.isArray(teamPayload?.data)
    ? teamPayload.data
    : unwrapArray(teamPayload);

  // 4. Request Detail Query
  const { data: detailRecord, isLoading: isDetailLoading } = useQuery({
    queryKey: ["me-encashment-compoff-detail", detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const res = await api.get(`/api/v1/me/leave/encashment-compoff/${detailId}`);
      return unwrapData<any>(res);
    },
    enabled: Boolean(detailId),
  });

  // Live ESS Encashment Preview
  useEffect(() => {
    if (
      !encashModalOpen ||
      !encashForm.leaveTypeId ||
      !encashForm.requestedDays ||
      Number(encashForm.requestedDays) <= 0
    ) {
      setEncashPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsEncashPreviewLoading(true);
        const res = await api.post("/api/v1/me/leave/encashment/preview", {
          leaveTypeId: encashForm.leaveTypeId,
          requestedDays: Number(encashForm.requestedDays),
          effectiveDate: encashForm.effectiveDate || todayIso,
          excludeEncashmentId: editingId || undefined,
        });
        if (!cancelled) setEncashPreview({ valid: true, data: unwrapData<any>(res) });
      } catch (err: unknown) {
        if (!cancelled) {
          setEncashPreview({
            valid: false,
            error: extractLeaveErrorMessage(err, "Encashment preview failed"),
          });
        }
      } finally {
        if (!cancelled) setIsEncashPreviewLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    encashModalOpen,
    editingId,
    encashForm.leaveTypeId,
    encashForm.requestedDays,
    encashForm.effectiveDate,
    todayIso,
  ]);

  // Live ESS Comp-Off Verification
  useEffect(() => {
    if (!compOffModalOpen || !compOffForm.workedOnDate) {
      setCompOffPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsCompOffPreviewLoading(true);
        const res = await api.post("/api/v1/me/leave/comp-off/verify", {
          workedOnDate: compOffForm.workedOnDate,
          workType: compOffForm.workType,
          actualHoursWorked:
            compOffForm.actualHoursWorked !== ""
              ? Number(compOffForm.actualHoursWorked)
              : undefined,
          requestedDays:
            compOffForm.requestedDays !== "" ? Number(compOffForm.requestedDays) : undefined,
          excludeRequestId: editingId || undefined,
        });
        if (!cancelled) setCompOffPreview({ valid: true, data: unwrapData<any>(res) });
      } catch (err: unknown) {
        if (!cancelled) {
          setCompOffPreview({
            valid: false,
            error: extractLeaveErrorMessage(err, "Comp-Off verification failed"),
          });
        }
      } finally {
        if (!cancelled) setIsCompOffPreviewLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    compOffModalOpen,
    editingId,
    compOffForm.workedOnDate,
    compOffForm.workType,
    compOffForm.actualHoursWorked,
    compOffForm.requestedDays,
  ]);

  // Mutations
  const submitEncashMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leaveTypeId: encashForm.leaveTypeId,
        requestedDays: Number(encashForm.requestedDays),
        effectiveDate: encashForm.effectiveDate,
        reason: encashForm.reason.trim(),
        attachmentUrl: encashForm.attachmentUrl || undefined,
      };
      if (editingId) {
        return await api.put(`/api/v1/me/leave/encashment-compoff/${editingId}`, payload);
      }
      return await api.post("/api/v1/me/leave/encashment", payload);
    },
    onSuccess: async () => {
      toast.success(editingId ? "Encashment request updated" : "Encashment request submitted");
      setEncashModalOpen(false);
      setEditingId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to submit encashment request"));
    },
  });

  const submitCompOffMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        workedOnDate: compOffForm.workedOnDate,
        workType: compOffForm.workType,
        reason: compOffForm.reason.trim(),
        attachmentUrl: compOffForm.attachmentUrl || undefined,
      };
      if (compOffForm.actualHoursWorked !== "") {
        payload.actualHoursWorked = Number(compOffForm.actualHoursWorked);
      }
      if (compOffForm.requestedDays !== "") {
        payload.requestedDays = Number(compOffForm.requestedDays);
      }
      if (editingId) {
        return await api.put(`/api/v1/me/leave/encashment-compoff/${editingId}`, payload);
      }
      return await api.post("/api/v1/me/leave/comp-off", payload);
    },
    onSuccess: async () => {
      toast.success(editingId ? "Comp-Off request updated" : "Comp-Off request submitted");
      setCompOffModalOpen(false);
      setEditingId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to submit Comp-Off request"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelTarget) return;
      return await api.post(`/api/v1/me/leave/encashment-compoff/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim() || "Cancelled by employee",
      });
    },
    onSuccess: async () => {
      toast.success("Request cancelled");
      setCancelTarget(null);
      setCancelReason("");
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to cancel request"));
    },
  });

  const teamDecisionMutation = useMutation({
    mutationFn: async () => {
      if (!teamDecisionTarget) return;
      if (teamDecisionTarget.action === "reject" && !teamDecisionNote.trim()) {
        throw new Error("Rejection reason is mandatory.");
      }
      return await api.post(
        `/api/v1/me/leave/team-encashment-compoff/${teamDecisionTarget.record.id}/decide`,
        {
          action: teamDecisionTarget.action,
          comments: teamDecisionNote.trim() || undefined,
          rejectionReason:
            teamDecisionTarget.action === "reject" ? teamDecisionNote.trim() : undefined,
        }
      );
    },
    onSuccess: async () => {
      toast.success("Team request decision recorded");
      setTeamDecisionTarget(null);
      setTeamDecisionNote("");
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to process team decision"));
    },
  });

  const handleFileUpload = async (
    file: File | undefined,
    target: "encashment" | "comp-off"
  ) => {
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      const url = await uploadLeaveSupportingDocument(file);
      if (target === "encashment") {
        setEncashForm((p) => ({ ...p, attachmentUrl: url }));
      } else {
        setCompOffForm((p) => ({ ...p, attachmentUrl: url }));
      }
      toast.success("Document uploaded");
    } catch (err: unknown) {
      toast.error(extractLeaveErrorMessage(err, "Upload failed"));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const openNewEncashModal = () => {
    setEditingId(null);
    setEncashForm({
      leaveTypeId: eligibleEncashTypes[0]?.leaveTypeId || "",
      requestedDays: "1",
      effectiveDate: todayIso,
      reason: "",
      attachmentUrl: "",
    });
    setEncashPreview(null);
    setEncashModalOpen(true);
  };

  const openNewCompOffModal = () => {
    setEditingId(null);
    setCompOffForm({
      workedOnDate: todayIso,
      workType: "WEEKLY_OFF",
      actualHoursWorked: "",
      requestedDays: "",
      reason: "",
      attachmentUrl: "",
    });
    setCompOffPreview(null);
    setCompOffModalOpen(true);
  };

  const openEditRow = (rec: any) => {
    setEditingId(rec.id);
    if (rec.type === "COMP_OFF") {
      setCompOffForm({
        workedOnDate: rec.workedOnDate ? String(rec.workedOnDate).slice(0, 10) : todayIso,
        workType: rec.workType || "WEEKLY_OFF",
        actualHoursWorked:
          rec.actualHoursWorked !== null && rec.actualHoursWorked !== undefined
            ? String(rec.actualHoursWorked)
            : "",
        requestedDays: rec.days ? String(rec.days) : "",
        reason: rec.reason || "",
        attachmentUrl: rec.attachmentUrl || rec.supportingDocUrl || "",
      });
      setCompOffModalOpen(true);
    } else {
      setEncashForm({
        leaveTypeId: rec.leaveTypeId,
        requestedDays: String(rec.days ?? 1),
        effectiveDate: rec.effectiveDate ? String(rec.effectiveDate).slice(0, 10) : todayIso,
        reason: rec.reason || "",
        attachmentUrl: rec.attachmentUrl || rec.supportingDocUrl || "",
      });
      setEncashModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Leave Encashment &amp; Comp-Off
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit leave encashment and Comp-Off earn requests, monitor available Comp-Off FIFO balance &amp; expiry alerts, and track payroll payout status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              refetchOverview();
              refetchMyRequests();
              if (activeTab === "team") refetchTeam();
            }}
            disabled={isRequestsFetching || isOverviewLoading}
            className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 text-[#00a76f] ${
                isRequestsFetching ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>

          {essCompOffAllowed && (
            <Button
              type="button"
              variant="outline"
              onClick={openNewCompOffModal}
              className="h-9 text-xs border-[#00a76f]/40 text-[#00a76f] hover:bg-[#00a76f]/10 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              Request Comp-Off
            </Button>
          )}

          {essEncashAllowed && (
            <Button
              type="button"
              onClick={openNewEncashModal}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium rounded-lg px-3.5 h-9 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Request Encashment
            </Button>
          )}
        </div>
      </div>

      {/* Expiring Comp-Off Alert Banner */}
      {Number(overview?.compOff?.expiringSoonDays || 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              You have{" "}
              <span className="font-bold">
                {formatLeaveDays(overview.compOff.expiringSoonDays)} Comp-Off day(s)
              </span>{" "}
              expiring soon
              {expiringLots[0]?.expiresAt
                ? ` (earliest expiry: ${formatDateDisplay(expiringLots[0].expiresAt)})`
                : ""}
              . Apply for Comp-Off leave before expiration!
            </span>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs shrink-0">
            <Link to={"/me/leave/applications" as any}>
              Apply Comp-Off Leave
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: "Available Comp-Off Balance",
            value: isOverviewLoading
              ? "…"
              : `${formatLeaveDays(overview?.compOff?.availableDays ?? 0)} Days`,
            sub: `${activeCompOffLots.length} active FIFO lot(s)`,
            icon: Coins,
            accent: "text-teal-600 bg-teal-50 dark:bg-teal-950/40",
          },
          {
            title: "Expiring Soon",
            value: isOverviewLoading
              ? "…"
              : `${formatLeaveDays(overview?.compOff?.expiringSoonDays ?? 0)} Days`,
            sub: "Within 14-day alert window",
            icon: AlertTriangle,
            accent: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
          },
          {
            title: "Pending Requests",
            value: isOverviewLoading ? "…" : overview?.counts?.pendingRequests ?? 0,
            sub: "Awaiting manager / HR review",
            icon: Clock,
            accent: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
          },
          {
            title: "Eligible Encashment Types",
            value: isOverviewLoading ? "…" : eligibleEncashTypes.length,
            sub: `${overview?.counts?.paidEncashments ?? 0} disbursed encashment(s)`,
            icon: CheckCircle2,
            accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
          },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-start justify-between gap-2"
            >
              <div>
                <p className="text-[11px] font-medium text-slate-500">{c.title}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {c.value}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${c.accent}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-1.5 shadow-xs flex flex-wrap items-center gap-1">
        {[
          { id: "encashments" as EssTab, label: "My Encashment Requests", icon: Banknote },
          { id: "comp-offs" as EssTab, label: "My Comp-Off Requests", icon: Coins },
          { id: "eligibility" as EssTab, label: "Eligible Quotas & FIFO Lots", icon: ShieldCheck },
          ...(directReportsCount > 0
            ? [
                {
                  id: "team" as EssTab,
                  label: `Team Approvals (${directReportsCount})`,
                  icon: Users,
                },
              ]
            : []),
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                active
                  ? "bg-[#00a76f] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar for My Encashments / My Comp-Offs / Team */}
      {activeTab !== "eligibility" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search code or reason…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="MANAGER_APPROVED">Manager Approved</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAYROLL_PENDING">Awaiting Payroll</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* My Encashments & My Comp-Offs Tables */}
      {(activeTab === "encashments" || activeTab === "comp-offs") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 text-[11px] uppercase">
                  <TableHead>Request Code</TableHead>
                  <TableHead>
                    {activeTab === "comp-offs" ? "Worked Date & Type" : "Leave Type & Date"}
                  </TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>
                    {activeTab === "comp-offs" ? "Remaining / Expiry" : "Estimated / Final Payout"}
                  </TableHead>
                  <TableHead>Approval &amp; Payroll Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRequestsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-500">
                      Loading your requests…
                    </TableCell>
                  </TableRow>
                ) : myRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No {activeTab === "comp-offs" ? "Comp-Off" : "Leave Encashment"} requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  myRows.map((r: any) => {
                    const st = String(r.status || "").toUpperCase();
                    const isCompOff = r.type === "COMP_OFF";
                    return (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell className="font-mono font-semibold">
                          {r.requestCode || r.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {isCompOff ? (
                            <div>
                              <div className="font-medium">{formatDateDisplay(r.workedOnDate)}</div>
                              <div className="text-[11px] text-slate-500">
                                {formatStatusLabel(r.workType)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">{r.leaveType?.name || "Leave"}</div>
                              <div className="text-[11px] text-slate-500">
                                Eff: {formatDateDisplay(r.effectiveDate || r.createdAt)}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatLeaveDays(r.approvedDays ?? r.days)} days
                        </TableCell>
                        <TableCell>
                          {isCompOff ? (
                            <div className="text-[11px]">
                              <div>Avail: {formatLeaveDays(r.remainingDays ?? 0)}d</div>
                              <div className="text-slate-500">
                                Exp: {formatDateDisplay(r.expiresAt)}
                              </div>
                            </div>
                          ) : (
                            <div className="font-semibold">
                              {formatCurrencyDynamic(r.totalAmount, r.currency || currencyCode)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              st
                            )}`}
                          >
                            {formatStatusLabel(st)}
                          </span>
                          {r.payrollMonth && r.payrollYear && (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              Payroll: {String(r.payrollMonth).padStart(2, "0")}/{r.payrollYear}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailId(r.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {["DRAFT", "PENDING", "CLARIFICATION_REQUESTED"].includes(st) && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditRow(r)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <SquarePen className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelTarget(r)}
                                  className="h-7 px-2 text-xs text-rose-600"
                                >
                                  <Ban className="w-3.5 h-3.5" />
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
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {myPagination.page || 1} of {Math.max(1, myPagination.totalPages || 1)} (
              {myPagination.total || 0} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= (myPagination.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Eligible Policies & Active Comp-Off FIFO Lots */}
      {activeTab === "eligibility" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Eligible Leave Encashment Quotas
            </h3>
            {eligibleEncashTypes.length === 0 ? (
              <p className="text-xs text-slate-500">
                No leave types are currently marked eligible for encashment under your workspace policy.
              </p>
            ) : (
              <div className="space-y-2.5">
                {eligibleEncashTypes.map((lt) => (
                  <div
                    key={lt.leaveTypeId}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {lt.leaveTypeName} ({lt.leaveTypeCode})
                      </span>
                      <span className="text-[#00a76f]">
                        Max Now: {formatLeaveDays(lt.maxRequestableNow)}d
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                      <span>Available: {formatLeaveDays(lt.availableBalance)}d</span>
                      <span>Min Retained: {formatLeaveDays(lt.minRetainedBalance)}d</span>
                      <span>Annual Rem: {formatLeaveDays(lt.remainingAnnualQuotaDays)}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Comp-Off FIFO Credit Lots
            </h3>
            {activeCompOffLots.length === 0 ? (
              <p className="text-xs text-slate-500">
                You currently have no active non-expired Comp-Off credit lots.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeCompOffLots.map((lot: any) => (
                  <div
                    key={lot.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        Worked {formatDateDisplay(lot.workedOnDate)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Expires: {formatDateDisplay(lot.expiresAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#00a76f]">
                        {formatLeaveDays(lot.remainingDays)}d available
                      </div>
                      <div className="text-[11px] text-slate-500">
                        of {formatLeaveDays(lot.creditedDays)}d credited
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Reporting Manager Team Approvals */}
      {activeTab === "team" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase">
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTeamLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-xs text-slate-500">
                      Loading direct-report requests…
                    </TableCell>
                  </TableRow>
                ) : teamRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-xs text-slate-500">
                      No direct-report requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  teamRows.map((r: any) => {
                    const st = String(r.status || "").toUpperCase();
                    return (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell>
                          <div className="font-semibold">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.employee?.employeeCode}
                          </div>
                        </TableCell>
                        <TableCell>{r.type}</TableCell>
                        <TableCell>
                          {formatDateDisplay(
                            r.type === "COMP_OFF" ? r.workedOnDate : r.effectiveDate || r.createdAt
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatLeaveDays(r.days)}d
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{r.reason || "—"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              st
                            )}`}
                          >
                            {formatStatusLabel(st)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {["PENDING", "CLARIFICATION_REQUESTED"].includes(st) && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  setTeamDecisionTarget({ record: r, action: "approve" })
                                }
                                className="h-7 text-[11px] bg-[#00a76f] hover:bg-[#008f5d] text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setTeamDecisionTarget({ record: r, action: "reject" })
                                }
                                className="h-7 text-[11px] text-rose-600 border-rose-200"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Submit / Edit ESS Encashment Modal */}
      <Dialog open={encashModalOpen} onOpenChange={setEncashModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingId ? "Edit Encashment Request" : "Request Leave Encashment"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an eligible leave type and review your calculated payout before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Eligible Leave Type *</Label>
              <Select
                value={encashForm.leaveTypeId}
                onValueChange={(v) => setEncashForm((p) => ({ ...p, leaveTypeId: v }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select eligible leave type" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEncashTypes.map((lt) => (
                    <SelectItem key={lt.leaveTypeId} value={lt.leaveTypeId}>
                      {lt.leaveTypeName} — Avail: {formatLeaveDays(lt.availableBalance)}d (Max:{" "}
                      {formatLeaveDays(lt.maxRequestableNow)}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Requested Days *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={encashForm.requestedDays}
                  onChange={(e) =>
                    setEncashForm((p) => ({ ...p, requestedDays: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective Date *</Label>
                <Input
                  type="date"
                  value={encashForm.effectiveDate}
                  onChange={(e) =>
                    setEncashForm((p) => ({ ...p, effectiveDate: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {isEncashPreviewLoading ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                Calculating encashment preview…
              </div>
            ) : encashPreview ? (
              encashPreview.valid ? (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                    <span>Estimated Net Payout</span>
                    <span>
                      {formatCurrencyDynamic(
                        encashPreview.data?.netPayableAmount ?? encashPreview.data?.totalAmount,
                        encashPreview.data?.currency || currencyCode
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Retained Balance: {formatLeaveDays(encashPreview.data?.retainedBalance)}d • Daily Rate:{" "}
                    {formatCurrencyDynamic(
                      encashPreview.data?.dailyRate ?? encashPreview.data?.unitDailyRate,
                      encashPreview.data?.currency || currencyCode
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{encashPreview.error}</span>
                </div>
              )
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea
                rows={3}
                value={encashForm.reason}
                onChange={(e) => setEncashForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div>
              <Label className="text-xs cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Paperclip className="w-3.5 h-3.5 text-[#00a76f]" />
                <span>{isUploadingDoc ? "Uploading…" : "Supporting Document"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0], "encashment")}
                />
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEncashModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                submitEncashMutation.isPending ||
                !encashForm.leaveTypeId ||
                !encashForm.reason.trim() ||
                (encashPreview && !encashPreview.valid)
              }
              onClick={() => submitEncashMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {submitEncashMutation.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit / Edit ESS Comp-Off Modal */}
      <Dialog open={compOffModalOpen} onOpenChange={setCompOffModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingId ? "Edit Comp-Off Request" : "Request Comp-Off Credit"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Claim compensatory time-off for verified holiday, weekly-off, or approved overtime work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Worked Date *</Label>
                <Input
                  type="date"
                  max={todayIso}
                  value={compOffForm.workedOnDate}
                  onChange={(e) =>
                    setCompOffForm((p) => ({ ...p, workedOnDate: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Work Category *</Label>
                <Select
                  value={compOffForm.workType}
                  onValueChange={(v) => setCompOffForm((p) => ({ ...p, workType: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY_OFF">Weekly Off Work</SelectItem>
                    <SelectItem value="PUBLIC_HOLIDAY">Public Holiday Work</SelectItem>
                    <SelectItem value="OVERTIME">Approved Overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isCompOffPreviewLoading ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                Verifying attendance &amp; overtime records…
              </div>
            ) : compOffPreview ? (
              compOffPreview.valid && compOffPreview.data?.eligible !== false ? (
                <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-teal-800 dark:text-teal-300">
                    <span>Eligible Comp-Off Credit</span>
                    <span>
                      {formatLeaveDays(
                        compOffPreview.data?.recommendedDays ??
                          compOffPreview.data?.convertedDays ??
                          1
                      )}{" "}
                      day(s)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Projected Expiry: {formatDateDisplay(compOffPreview.data?.projectedExpiresAt)}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {compOffPreview.error ||
                      compOffPreview.data?.ineligibilityReason ||
                      "Date is not eligible for Comp-Off."}
                  </span>
                </div>
              )
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Work Justification / Reason *</Label>
              <Textarea
                rows={3}
                value={compOffForm.reason}
                onChange={(e) => setCompOffForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div>
              <Label className="text-xs cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Paperclip className="w-3.5 h-3.5 text-[#00a76f]" />
                <span>{isUploadingDoc ? "Uploading…" : "Supporting Proof"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0], "comp-off")}
                />
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompOffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                submitCompOffMutation.isPending ||
                !compOffForm.workedOnDate ||
                !compOffForm.reason.trim() ||
                (compOffPreview && (!compOffPreview.valid || compOffPreview.data?.eligible === false))
              }
              onClick={() => submitCompOffMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {submitCompOffMutation.isPending ? "Submitting…" : "Submit Comp-Off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Request Confirmation Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Cancel Request</DialogTitle>
            <DialogDescription className="text-xs">
              Cancel request {cancelTarget?.requestCode || cancelTarget?.id?.slice(0, 8)}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 text-xs">
            <Label className="text-xs">Cancellation Note</Label>
            <Textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
              Keep Request
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager Team Decision Dialog */}
      <Dialog
        open={Boolean(teamDecisionTarget)}
        onOpenChange={(open) => {
          if (!open) setTeamDecisionTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold capitalize">
              {teamDecisionTarget?.action} Direct-Report Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              {teamDecisionTarget?.record?.employee?.firstName}{" "}
              {teamDecisionTarget?.record?.employee?.lastName} •{" "}
              {formatLeaveDays(teamDecisionTarget?.record?.days)} day(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 text-xs">
            <Label className="text-xs">
              {teamDecisionTarget?.action === "reject" ? "Rejection Reason *" : "Approval Note"}
            </Label>
            <Textarea
              rows={3}
              value={teamDecisionNote}
              onChange={(e) => setTeamDecisionNote(e.target.value)}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTeamDecisionTarget(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={teamDecisionMutation.isPending}
              onClick={() => teamDecisionMutation.mutate()}
              className={
                teamDecisionTarget?.action === "reject"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-[#00a76f] hover:bg-[#008f5d] text-white"
              }
            >
              {teamDecisionMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Request Details — {detailRecord?.requestCode || detailId?.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Approval timeline, payroll status, and ledger references.
            </DialogDescription>
          </DialogHeader>
          {isDetailLoading || !detailRecord ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading details…</div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className="font-semibold">{formatStatusLabel(detailRecord.status)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Days</span>
                  <span className="font-semibold">
                    {formatLeaveDays(detailRecord.approvedDays ?? detailRecord.days)} day(s)
                  </span>
                </div>
                {detailRecord.type === "ENCASHMENT" ? (
                  <>
                    <div>
                      <span className="text-slate-500 block">Net Payable</span>
                      <span className="font-semibold">
                        {formatCurrencyDynamic(
                          detailRecord.totalAmount,
                          detailRecord.currency || currencyCode
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Payroll Status</span>
                      <span className="font-semibold">
                        {detailRecord.payrollStatus || "Not Queued"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500 block">Worked On</span>
                      <span className="font-semibold">
                        {formatDateDisplay(detailRecord.workedOnDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Expires On</span>
                      <span className="font-semibold">
                        {formatDateDisplay(detailRecord.expiresAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {Array.isArray(detailRecord.events) && detailRecord.events.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold">Approval &amp; Status History</h4>
                  <div className="space-y-2 border-l-2 border-[#00a76f]/40 pl-3 ml-1">
                    {detailRecord.events.map((ev: any) => (
                      <div key={ev.id} className="text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{formatStatusLabel(ev.action)}</span>
                          <span className="text-slate-500">{formatDateDisplay(ev.createdAt)}</span>
                        </div>
                        {ev.notes && <div className="text-slate-600 dark:text-slate-300">{ev.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
