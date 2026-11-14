import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import {
  formatLeaveDays,
  extractLeaveErrorMessage,
  uploadLeaveSupportingDocument,
  invalidateLeaveApplications,
  useDebouncedValue,
} from "@/lib/leave-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calculator,
  Ban,
  Edit2,
  Paperclip,
  ExternalLink,
  Search,
  Eye,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/me/leave/applications")({
  component: MeLeaveApplicationsPage,
});

export default function MeLeaveApplicationsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getUTCFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [detailAppId, setDetailAppId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: todayStr,
    endDate: todayStr,
    halfDay: false,
    halfDaySession: "FIRST_HALF" as "FIRST_HALF" | "SECOND_HALF",
    reason: "",
    attachmentUrl: "",
  });

  const [dryRunData, setDryRunData] = useState<any>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);

  const {
    data: applications = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["me-leave-applications", selectedYear],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/applications", {
        params: { year: selectedYear },
      });
      return unwrapArray<any>(res);
    },
  });

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["me-leave-catalog", selectedYear],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/catalog", {
        params: { year: selectedYear },
      });
      return unwrapData<any>(res);
    },
  });

  const leaveTypes: any[] = useMemo(() => {
    if (Array.isArray(catalogData?.leaveTypes)) return catalogData.leaveTypes;
    if (Array.isArray(catalogData)) return catalogData;
    return [];
  }, [catalogData]);

  const selectedTypeConfig = useMemo(
    () => leaveTypes.find((t: any) => (t.id || t.leaveTypeId) === form.leaveTypeId) || null,
    [leaveTypes, form.leaveTypeId]
  );

  const halfDayAllowedByPolicy =
    selectedTypeConfig?.policy?.halfDayAllowed ?? selectedTypeConfig?.halfDayAllowed ?? true;

  useEffect(() => {
    if (form.halfDay && form.endDate !== form.startDate) {
      setForm((prev) => ({ ...prev, endDate: prev.startDate }));
    }
  }, [form.halfDay, form.startDate, form.endDate]);

  useEffect(() => {
    if (!halfDayAllowedByPolicy && form.halfDay) {
      setForm((prev) => ({ ...prev, halfDay: false }));
    }
  }, [halfDayAllowedByPolicy, form.halfDay]);

  useEffect(() => {
    if (!modalOpen || !form.leaveTypeId || !form.startDate || !form.endDate) {
      setDryRunData(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsDryRunning(true);
        const res = await api.post("/api/v1/me/leave/applications/dry-run", {
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.halfDay ? form.startDate : form.endDate,
          halfDay: form.halfDay,
          halfDaySession: form.halfDay ? form.halfDaySession : undefined,
          reason: form.reason || "Dry run preview",
          excludeRequestId: editingId || undefined,
        });
        if (!cancelled) {
          setDryRunData(unwrapData(res));
        }
      } catch (err: any) {
        if (!cancelled) {
          setDryRunData({
            valid: false,
            error: extractLeaveErrorMessage(err, "Leave validation failed"),
          });
        }
      } finally {
        if (!cancelled) setIsDryRunning(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    modalOpen,
    editingId,
    form.leaveTypeId,
    form.startDate,
    form.endDate,
    form.halfDay,
    form.halfDaySession,
  ]);

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ["me-leave-application-detail", detailAppId],
    enabled: Boolean(detailAppId),
    queryFn: async () => {
      const res = await api.get(`/api/v1/me/leave/applications/${detailAppId}`);
      return unwrapData<any>(res);
    },
  });

  function resetForm() {
    setEditingId(null);
    setForm({
      leaveTypeId: "",
      startDate: todayStr,
      endDate: todayStr,
      halfDay: false,
      halfDaySession: "FIRST_HALF",
      reason: "",
      attachmentUrl: "",
    });
    setDryRunData(null);
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(app: any) {
    setEditingId(app.id);
    setForm({
      leaveTypeId: app.leaveTypeId || app.leaveType?.id || "",
      startDate: String(app.startDate).slice(0, 10),
      endDate: String(app.endDate).slice(0, 10),
      halfDay: Boolean(app.halfDay || app.isHalfDay || Number(app.days) === 0.5),
      halfDaySession:
        app.halfDaySession === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF",
      reason: app.reason || "",
      attachmentUrl: app.attachmentUrl || "",
    });
    setDryRunData(null);
    setModalOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      const uploadedUrl = await uploadLeaveSupportingDocument(file);
      setForm((prev) => ({ ...prev, attachmentUrl: uploadedUrl }));
      toast.success("Supporting document uploaded");
    } catch (err: any) {
      toast.error(extractLeaveErrorMessage(err, "Failed to upload supporting document"));
    } finally {
      setIsUploadingDoc(false);
      e.target.value = "";
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.halfDay ? form.startDate : form.endDate,
        halfDay: form.halfDay,
        halfDaySession: form.halfDay ? form.halfDaySession : undefined,
        reason: form.reason.trim(),
        attachmentUrl: form.attachmentUrl || undefined,
      };
      if (editingId) {
        const res = await api.put(`/api/v1/me/leave/applications/${editingId}`, payload);
        return unwrapData(res);
      }
      const res = await api.post("/api/v1/me/leave/applications", payload);
      return unwrapData(res);
    },
    onSuccess: async (resData: any) => {
      await invalidateLeaveApplications(queryClient);
      toast.success(
        editingId
          ? "Pending leave request updated"
          : resData?.status === "approved"
          ? "Leave application submitted and auto-approved by policy"
          : "Leave application submitted for approval"
      );
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to submit leave application"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/api/v1/me/leave/applications/${id}/cancel`, {
        reason: reason.trim() || "Withdrawn by employee",
      });
      return unwrapData(res);
    },
    onSuccess: async () => {
      await invalidateLeaveApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: ["me-attendance-records"] });
      toast.success("Leave application cancelled and balance updated");
      setCancelModalOpen(false);
      setSelectedApp(null);
      setCancelReason("");
    },
    onError: (err: any) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to cancel leave application"));
    },
  });

  const pendingCount = applications.filter((a: any) => a.status === "pending").length;
  const approvedCount = applications.filter((a: any) => a.status === "approved").length;
  const closedCount = applications.filter(
    (a: any) => a.status === "rejected" || a.status === "cancelled"
  ).length;

  const filteredApplications = useMemo(() => {
    return applications.filter((a: any) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        const typeName = String(a.leaveType?.name || "").toLowerCase();
        const reason = String(a.reason || "").toLowerCase();
        const reviewer = String(a.approverName || "").toLowerCase();
        if (!typeName.includes(q) && !reason.includes(q) && !reviewer.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [applications, statusFilter, debouncedSearch]);

  function canSelfCancel(app: any): boolean {
    if (app.status === "pending") return true;
    if (app.status === "approved") {
      const startIso = String(app.startDate).slice(0, 10);
      return startIso >= todayStr;
    }
    return false;
  }

  const isDryRunValid =
    Boolean(dryRunData) &&
    !dryRunData.error &&
    dryRunData.valid !== false &&
    dryRunData.sufficientBalance !== false &&
    (!Array.isArray(dryRunData.blockingIssues) || dryRunData.blockingIssues.length === 0);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="My Leave Applications"
        description="Submit leave requests against live HR leave policies and track real-time approval status."
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter year"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={openCreateModal} data-testid="ess-apply-leave-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            Apply for Leave
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Applications"
          value={applications.length}
          icon={<FileText className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Pending Approval"
          value={pendingCount}
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
        />
        <StatCard
          label="Approved Leaves"
          value={approvedCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          className="border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
        />
        <StatCard
          label="Rejected / Cancelled"
          value={closedCount}
          icon={<XCircle className="w-5 h-5 text-rose-500" />}
        />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold">My Leave History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search leave type or reason..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["all", "pending", "approved", "rejected", "cancelled"].map((st) => {
              const count =
                st === "all"
                  ? applications.length
                  : applications.filter((a: any) => a.status === st).length;
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your leave applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-muted-foreground">
              No leave applications found for the selected filter.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Leave Type</th>
                      <th className="py-3 px-4 text-left">Dates</th>
                      <th className="py-3 px-4 text-left">Duration</th>
                      <th className="py-3 px-4 text-left">Reason & Attachment</th>
                      <th className="py-3 px-4 text-left">Status & Reviewer</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredApplications.map((a: any) => (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: a.leaveType?.color || "#3B82F6" }}
                            />
                            <span className="font-medium">{a.leaveType?.name || "Leave"}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {a.leaveType?.isPaid === false ? "Unpaid" : "Paid"}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                          {formatLeaveDays(a.days)} {Number(a.days) === 1 ? "day" : "days"}
                          {(a.halfDay || a.isHalfDay) && (
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              {a.halfDaySession === "SECOND_HALF" ? "Second Half" : "First Half"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">
                          <div className="truncate" title={a.reason}>
                            {a.reason}
                          </div>
                          {a.attachmentUrl && (
                            <a
                              href={a.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                            >
                              <Paperclip className="w-3 h-3" />
                              View Attachment
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <Badge
                              variant={
                                a.status === "approved"
                                  ? "default"
                                  : a.status === "rejected"
                                  ? "destructive"
                                  : a.status === "cancelled"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="capitalize text-xs"
                            >
                              {a.status}
                            </Badge>
                            {a.approverName && (
                              <div className="text-[11px] text-muted-foreground">
                                By {a.approverName}
                              </div>
                            )}
                            {a.rejectionReason && (
                              <div
                                className="text-[11px] text-rose-600 max-w-[200px] truncate"
                                title={a.rejectionReason}
                              >
                                Note: {a.rejectionReason}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => setDetailAppId(a.id)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Button>
                            {a.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => openEditModal(a)}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                            )}
                            {canSelfCancel(a) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700"
                                onClick={() => {
                                  setSelectedApp(a);
                                  setCancelModalOpen(true);
                                }}
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {filteredApplications.map((a: any) => (
                  <div key={a.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: a.leaveType?.color || "#3B82F6" }}
                        />
                        <span className="font-semibold text-sm truncate">
                          {a.leaveType?.name || "Leave"}
                        </span>
                      </div>
                      <Badge
                        variant={
                          a.status === "approved"
                            ? "default"
                            : a.status === "rejected"
                            ? "destructive"
                            : a.status === "cancelled"
                            ? "outline"
                            : "secondary"
                        }
                        className="capitalize text-xs shrink-0"
                      >
                        {a.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
                      <span>
                        {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatLeaveDays(a.days)} day(s)
                        {(a.halfDay || a.isHalfDay)
                          ? ` (${a.halfDaySession === "SECOND_HALF" ? "2nd Half" : "1st Half"})`
                          : ""}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground break-words">{a.reason}</p>

                    {a.rejectionReason && (
                      <p className="text-xs text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded">
                        Reviewer Note: {a.rejectionReason}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setDetailAppId(a.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
                      {a.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => openEditModal(a)}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                      {canSelfCancel(a) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-rose-600 border-rose-200"
                          onClick={() => {
                            setSelectedApp(a);
                            setCancelModalOpen(true);
                          }}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Pending Leave Request" : "Apply for Leave"}
            </DialogTitle>
            <DialogDescription>
              Leave types, eligibility rules, and balances reflect live HR policy configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <label className="text-xs font-semibold block mb-1">Leave Type *</label>
              <select
                data-testid="ess-leave-type-select"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                value={form.leaveTypeId}
                disabled={isCatalogLoading}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">
                  {isCatalogLoading
                    ? "Loading active leave types..."
                    : "-- Select Leave Category --"}
                </option>
                {leaveTypes.map((t: any) => {
                  const id = t.id || t.leaveTypeId;
                  const name = t.name || t.leaveTypeName;
                  const avail = t.balance?.available ?? t.available ?? 0;
                  const isUnpaidZero = t.isPaid === false && Number(t.daysPerYear ?? 0) === 0;
                  const eligible = t.eligible !== false;
                  return (
                    <option key={id} value={id} disabled={!eligible && id !== form.leaveTypeId}>
                      {name}{" "}
                      {isUnpaidZero
                        ? "(Unpaid Leave)"
                        : `(Available: ${formatLeaveDays(avail)} days)`}
                      {!eligible ? ` — ${t.ineligibleReason || "Restricted"}` : ""}
                    </option>
                  );
                })}
              </select>

              {selectedTypeConfig && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <Badge variant="outline">
                    {selectedTypeConfig.isPaid === false ? "Unpaid" : "Paid"}
                  </Badge>
                  {selectedTypeConfig.policy?.noticeDays > 0 && (
                    <Badge variant="outline">
                      Notice: {selectedTypeConfig.policy.noticeDays}d
                    </Badge>
                  )}
                  {selectedTypeConfig.policy?.minDays && (
                    <Badge variant="outline">
                      Min: {formatLeaveDays(selectedTypeConfig.policy.minDays)}d
                    </Badge>
                  )}
                  {selectedTypeConfig.policy?.maxConsecutiveDays && (
                    <Badge variant="outline">
                      Max: {selectedTypeConfig.policy.maxConsecutiveDays}d
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Sandwich: {selectedTypeConfig.policy?.sandwichRule ? "On" : "Off"}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTypeConfig.policy?.requiresApproval === false
                      ? "Auto-Approve"
                      : "Requires Approval"}
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Start Date *</label>
                <Input
                  type="date"
                  data-testid="ess-leave-start-date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                      endDate:
                        prev.halfDay || !prev.endDate || prev.endDate < e.target.value
                          ? e.target.value
                          : prev.endDate,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">End Date *</label>
                <Input
                  type="date"
                  data-testid="ess-leave-end-date"
                  value={form.halfDay ? form.startDate : form.endDate}
                  disabled={form.halfDay}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="me-halfDay"
                  className={`text-xs font-medium flex items-center gap-2 ${
                    halfDayAllowedByPolicy ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    id="me-halfDay"
                    data-testid="ess-leave-halfday-checkbox"
                    checked={form.halfDay}
                    disabled={!halfDayAllowedByPolicy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        halfDay: e.target.checked,
                        endDate: e.target.checked ? prev.startDate : prev.endDate,
                      }))
                    }
                    className="rounded border-input"
                  />
                  Apply as Half-Day Leave (0.5 day deduction)
                </label>
                {!halfDayAllowedByPolicy && (
                  <span className="text-[11px] text-amber-600">Disabled by policy</span>
                )}
              </div>

              {form.halfDay && (
                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Half-Day Session
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["FIRST_HALF", "SECOND_HALF"] as const).map((sess) => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => setForm({ ...form, halfDaySession: sess })}
                        className={`py-1.5 px-3 rounded-md border text-xs font-medium transition-colors ${
                          form.halfDaySession === sess
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background text-muted-foreground"
                        }`}
                      >
                        {sess === "FIRST_HALF" ? "First Half (Morning)" : "Second Half (Afternoon)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Reason for Leave *</label>
              <Textarea
                rows={2}
                data-testid="ess-leave-reason"
                placeholder="State reason for your leave request..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                Supporting Document (Optional, max 10 MB)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={isUploadingDoc}
                  className="text-xs file:mr-2 file:text-xs"
                />
                {isUploadingDoc && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </span>
                )}
              </div>
              {form.attachmentUrl && (
                <div className="mt-1.5 flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1.5 rounded border">
                  <a
                    href={form.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 truncate"
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    Attached document
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, attachmentUrl: "" })}
                    className="text-rose-600 hover:underline ml-2 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {isDryRunning ? (
              <div className="p-3 border rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Validating policy rules & quota balance...
              </div>
            ) : dryRunData ? (
              <div
                data-testid="ess-dry-run-card"
                className={`p-3 border rounded-lg text-xs space-y-1.5 ${
                  !isDryRunValid
                    ? "border-rose-200 bg-rose-50/40 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
                    : "border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    Policy & Quota Validation
                  </span>
                  <span>
                    {!isDryRunValid
                      ? "Cannot Submit"
                      : `${formatLeaveDays(dryRunData.computedDays ?? dryRunData.totalDeductedDays)} Day(s)`}
                  </span>
                </div>
                {!isDryRunValid ? (
                  <p className="text-rose-600 dark:text-rose-300">
                    {dryRunData.error ||
                      dryRunData.blockingIssues?.[0] ||
                      "Insufficient leave balance or policy restriction."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      Available:{" "}
                      <strong>
                        {dryRunData.isUnlimitedUnpaid
                          ? "Unpaid (Allowed)"
                          : `${formatLeaveDays(dryRunData.availableBalance)} days`}
                      </strong>
                    </div>
                    <div>
                      Remaining After:{" "}
                      <strong>
                        {dryRunData.isUnlimitedUnpaid
                          ? "Unpaid"
                          : `${formatLeaveDays(dryRunData.projectedRemainingBalance ?? (Number(dryRunData.availableBalance) - Number(dryRunData.computedDays)))} days`}
                      </strong>
                    </div>
                    {Number(dryRunData.sandwichDaysAdded) > 0 && (
                      <div className="col-span-2 text-amber-700 dark:text-amber-300">
                        Sandwich Rule: +{formatLeaveDays(dryRunData.sandwichDaysAdded)} weekend/holiday day(s) included.
                      </div>
                    )}
                    {Array.isArray(dryRunData.warnings) &&
                      dryRunData.warnings.map((w: string, i: number) => (
                        <div key={i} className="col-span-2 text-amber-700 dark:text-amber-300">
                          {w}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="ess-submit-leave-btn"
              onClick={() => submitMutation.mutate()}
              disabled={
                !form.leaveTypeId ||
                !form.reason.trim() ||
                isUploadingDoc ||
                isDryRunning ||
                !isDryRunValid ||
                submitMutation.isPending
              }
            >
              {submitMutation.isPending
                ? "Submitting..."
                : editingId
                ? "Save Changes"
                : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailAppId)} onOpenChange={(o) => !o && setDetailAppId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {isDetailLoading || !detailData ? (
            <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading details...
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground block">Leave Category</span>
                  <span className="font-semibold text-sm">{detailData.leaveType?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <Badge className="capitalize mt-0.5">{detailData.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block">Dates</span>
                  <span className="font-mono">
                    {String(detailData.startDate).slice(0, 10)} →{" "}
                    {String(detailData.endDate).slice(0, 10)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Duration</span>
                  <span className="font-mono font-semibold">
                    {formatLeaveDays(detailData.days)} day(s)
                    {detailData.halfDay ? ` (${detailData.halfDaySession || "Half-Day"})` : ""}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold block mb-1">Reason</span>
                <p className="p-2.5 rounded border bg-background text-muted-foreground">
                  {detailData.reason}
                </p>
              </div>

              {detailData.approverName && (
                <div className="p-2.5 rounded border bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Reviewed by {detailData.approverName}
                  </div>
                  {detailData.approvedAt && (
                    <div className="text-muted-foreground">
                      Timestamp: {new Date(detailData.approvedAt).toLocaleString()}
                    </div>
                  )}
                  {detailData.rejectionReason && (
                    <div className="text-rose-600">
                      Reviewer Remarks: {detailData.rejectionReason}
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(detailData.ledgerTransactions) &&
                detailData.ledgerTransactions.length > 0 && (
                  <div>
                    <span className="font-semibold block mb-1.5">Ledger Audit Trail</span>
                    <div className="border rounded divide-y">
                      {detailData.ledgerTransactions.map((t: any) => (
                        <div key={t.id} className="p-2 flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="font-mono text-[10px] mr-2">
                              {t.entryType}
                            </Badge>
                            <span className="text-muted-foreground">{t.notes}</span>
                          </div>
                          <span className="font-mono font-semibold">
                            {t.entryType === "DEBIT" ? "-" : "+"}
                            {formatLeaveDays(t.days)}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAppId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Leave Application</DialogTitle>
            <DialogDescription>
              {selectedApp?.status === "approved"
                ? "Cancelling an upcoming approved leave will post a compensating CREDIT entry to restore your balance."
                : "Withdrawing this pending request will remove it from the approval queue."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Reason for Cancellation</label>
              <Input
                placeholder="Schedule changed, plans updated, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedApp &&
                cancelMutation.mutate({ id: selectedApp.id, reason: cancelReason })
              }
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
