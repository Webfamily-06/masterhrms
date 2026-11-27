"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Loader2, Plus, RefreshCw, Save, Trash2, Pencil } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BroadcastSeverity = "info" | "warning" | "critical" | "maintenance";
type BroadcastAudienceType = "all" | "plans" | "tenants";
type BroadcastStatus = "draft" | "scheduled" | "active" | "expired";

interface PlatformBroadcast {
  id: string;
  title: string;
  message: string;
  severity: BroadcastSeverity;
  audienceType: BroadcastAudienceType;
  targetPlanIds?: string[];
  targetTenantIds?: string[];
  startsAt: string;
  endsAt?: string | null;
  dismissible: boolean;
  status: BroadcastStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanOption {
  id: string;
  name: string;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export type NotificationTemplate = {
  id: string;
  trigger_event: string;
  channel: "in_app" | "email" | "sms" | "push";
  title_template: string;
  body_template: string;
  enabled: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationTemplate[] = [
  {
    id: "n-1",
    trigger_event: "Leave Request Submitted",
    channel: "in_app",
    title_template: "New Leave Application",
    body_template: "{{employee_name}} has applied for {{leave_days}} days of {{leave_type}} leave.",
    enabled: true,
  },
  {
    id: "n-2",
    trigger_event: "Payroll Released",
    channel: "push",
    title_template: "Salary Processed",
    body_template: "Your salary for {{month}} has been deposited to your bank account.",
    enabled: true,
  },
  {
    id: "n-3",
    trigger_event: "Support Ticket Reply",
    channel: "email",
    title_template: "Reply to Ticket #{{ticket_id}}",
    body_template: "Support agent replied: {{reply_snippet}}",
    enabled: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "No expiry";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityBadgeVariant(severity: BroadcastSeverity) {
  switch (severity) {
    case "critical":
      return "destructive" as const;
    case "warning":
    case "maintenance":
      return "warning" as const;
    case "info":
    default:
      return "info" as const;
  }
}

function statusBadgeVariant(status: BroadcastStatus) {
  switch (status) {
    case "active":
      return "success" as const;
    case "scheduled":
      return "info" as const;
    case "draft":
      return "secondary" as const;
    case "expired":
    default:
      return "outline" as const;
  }
}

function previewAlertProps(severity: BroadcastSeverity) {
  switch (severity) {
    case "critical":
      return {
        variant: "ghost-danger" as const,
        icon: <i className="ph ph-warning-octagon text-base leading-none" />,
      };
    case "warning":
      return {
        variant: "ghost-warning" as const,
        icon: <i className="ph ph-warning text-base leading-none" />,
      };
    case "maintenance":
      return {
        variant: "border-warning" as const,
        icon: <i className="ph ph-wrench text-base leading-none text-amber-600 dark:text-amber-400" />,
      };
    case "info":
    default:
      return {
        variant: "ghost-info" as const,
        icon: <i className="ph ph-info text-base leading-none" />,
      };
  }
}

interface BroadcastFormState {
  title: string;
  message: string;
  severity: BroadcastSeverity;
  audienceType: BroadcastAudienceType;
  targetPlanIds: string[];
  targetTenantIds: string[];
  startsAt: string;
  endsAt: string;
  dismissible: boolean;
  status: BroadcastStatus;
}

function createEmptyForm(): BroadcastFormState {
  return {
    title: "",
    message: "",
    severity: "info",
    audienceType: "all",
    targetPlanIds: [],
    targetTenantIds: [],
    startsAt: toDatetimeLocalValue(new Date().toISOString()),
    endsAt: "",
    dismissible: true,
    status: "active",
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SuperNotificationsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"broadcasts" | "templates">("broadcasts");

  // ── Broadcasts State ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<PlatformBroadcast | null>(null);
  const [form, setForm] = useState<BroadcastFormState>(createEmptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PlatformBroadcast | null>(null);

  // ── Notification Templates State (local draft — NO PUT on every keystroke) ─
  const [draftTemplates, setDraftTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesDirty, setTemplatesDirty] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: broadcasts = [],
    isLoading: loadingBroadcasts,
    isFetching: fetchingBroadcasts,
    refetch: refetchBroadcasts,
  } = useQuery<PlatformBroadcast[]>({
    queryKey: ["super-broadcasts"],
    queryFn: async () => {
      const res = await api.get("/super/broadcasts");
      const raw = res?.data || res || {};
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.broadcasts)) return raw.broadcasts;
      return [];
    },
  });

  const { data: planOptions = [] } = useQuery<PlanOption[]>({
    queryKey: ["super-plans-options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const res = await api.get("/super/plans");
        const raw = res?.data || res || [];
        const list = Array.isArray(raw) ? raw : Array.isArray(raw.plans) ? raw.plans : [];
        return list.map((p: any) => ({ id: String(p.id), name: String(p.name || p.id) }));
      } catch {
        return [];
      }
    },
  });

  const { data: tenantOptions = [] } = useQuery<TenantOption[]>({
    queryKey: ["super-tenants-options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const res = await api.get("/super/tenants?limit=100");
        const raw = res?.data || res || [];
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.tenants)
          ? raw.tenants
          : Array.isArray(raw.data)
          ? raw.data
          : [];
        return list.map((t: any) => ({
          id: String(t.id),
          name: String(t.name || t.slug || t.id),
          slug: String(t.slug || ""),
        }));
      } catch {
        return [];
      }
    },
  });

  const {
    data: serverTemplates,
    isLoading: loadingTemplates,
    refetch: refetchTemplates,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ["realtime-notification-templates"],
    queryFn: async () => {
      try {
        const res = await api.get("/cms/pages/system-notification-templates");
        const page = res?.data || res || {};
        if (page?.content && Array.isArray(page.content.notifications)) {
          return page.content.notifications as NotificationTemplate[];
        }
        return DEFAULT_NOTIFICATIONS;
      } catch {
        return DEFAULT_NOTIFICATIONS;
      }
    },
  });

  useEffect(() => {
    if (serverTemplates && !templatesDirty) {
      setDraftTemplates(serverTemplates);
    }
  }, [serverTemplates, templatesDirty]);

  // ── Broadcast Mutations ────────────────────────────────────────────────────
  const saveBroadcastMutation = useMutation({
    mutationFn: async (payload: { id?: string; body: Record<string, unknown> }) => {
      if (payload.id) {
        const res = await api.put(`/super/broadcasts/${encodeURIComponent(payload.id)}`, payload.body);
        return res?.data || res || {};
      }
      const res = await api.post("/super/broadcasts", payload.body);
      return res?.data || res || {};
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.id ? "Broadcast alert updated." : "Broadcast alert published.");
      setDialogOpen(false);
      setEditingBroadcast(null);
      setForm(createEmptyForm());
      qc.invalidateQueries({ queryKey: ["super-broadcasts"] });
      qc.invalidateQueries({ queryKey: ["platform-active-broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save broadcast alert.");
    },
  });

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super/broadcasts/${encodeURIComponent(id)}`);
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success("Broadcast alert deleted.");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["super-broadcasts"] });
      qc.invalidateQueries({ queryKey: ["platform-active-broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete broadcast alert.");
    },
  });

  // ── Template Save Mutation (explicit Save button only) ─────────────────────
  const saveTemplatesMutation = useMutation({
    mutationFn: async (updatedList: NotificationTemplate[]) => {
      await api.put("/cms/pages/system-notification-templates", {
        title: "System Notification Templates",
        meta_description: "Realtime notification triggers and push templates",
        content: { notifications: updatedList },
        published: true,
      });
    },
    onSuccess: () => {
      toast.success("Notification templates saved.");
      setTemplatesDirty(false);
      qc.invalidateQueries({ queryKey: ["realtime-notification-templates"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save notification templates.");
    },
  });

  // ── Derived Broadcast Stats & Filtered List ────────────────────────────────
  const broadcastStats = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let draft = 0;
    let expired = 0;
    for (const b of broadcasts) {
      if (b.status === "active") active++;
      else if (b.status === "scheduled") scheduled++;
      else if (b.status === "draft") draft++;
      else expired++;
    }
    return { total: broadcasts.length, active, scheduled, draft, expired };
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return broadcasts.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q && !`${b.title} ${b.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [broadcasts, statusFilter, searchQuery]);

  const planNameById = useMemo(
    () => new Map(planOptions.map((p) => [p.id, p.name])),
    [planOptions]
  );
  const tenantNameById = useMemo(
    () => new Map(tenantOptions.map((t) => [t.id, t.name])),
    [tenantOptions]
  );

  // ── Broadcast Handlers ─────────────────────────────────────────────────────
  function openCreateDialog() {
    setEditingBroadcast(null);
    setForm(createEmptyForm());
    setDialogOpen(true);
  }

  function openEditDialog(b: PlatformBroadcast) {
    setEditingBroadcast(b);
    setForm({
      title: b.title,
      message: b.message,
      severity: b.severity,
      audienceType: b.audienceType,
      targetPlanIds: b.targetPlanIds || [],
      targetTenantIds: b.targetTenantIds || [],
      startsAt: toDatetimeLocalValue(b.startsAt),
      endsAt: toDatetimeLocalValue(b.endsAt),
      dismissible: b.dismissible,
      status: b.status,
    });
    setDialogOpen(true);
  }

  function handleSubmitBroadcast() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Please provide both a title and a message.");
      return;
    }
    if (form.audienceType === "plans" && form.targetPlanIds.length === 0) {
      toast.error("Select at least one subscription plan.");
      return;
    }
    if (form.audienceType === "tenants" && form.targetTenantIds.length === 0) {
      toast.error("Select at least one tenant workspace.");
      return;
    }

    const startsAtIso = form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString();
    const endsAtIso = form.endsAt ? new Date(form.endsAt).toISOString() : null;

    if (endsAtIso && Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
      toast.error("End time must be after start time.");
      return;
    }

    saveBroadcastMutation.mutate({
      id: editingBroadcast?.id,
      body: {
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        audienceType: form.audienceType,
        targetPlanIds: form.audienceType === "plans" ? form.targetPlanIds : [],
        targetTenantIds: form.audienceType === "tenants" ? form.targetTenantIds : [],
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        dismissible: form.dismissible,
        status: form.status,
      },
    });
  }

  function toggleSelection(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  // ── Template Local Draft Handlers ──────────────────────────────────────────
  function handleLocalTemplateChange(
    id: string,
    field: "title_template" | "body_template" | "enabled",
    val: string | boolean
  ) {
    setDraftTemplates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
    setTemplatesDirty(true);
  }

  function handleDiscardTemplates() {
    setDraftTemplates(serverTemplates ?? DEFAULT_NOTIFICATIONS);
    setTemplatesDirty(false);
  }

  const previewCfg = previewAlertProps(form.severity);

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Platform Broadcasts & Notifications"
        description="Publish targeted platform-wide alert banners to workspaces and manage automated notification templates."
        icon={<i className="ph-duotone ph-megaphone text-2xl" />}
        badge={
          <Badge variant="soft" className="text-xs">
            {broadcastStats.active} Active
          </Badge>
        }
        actions={
          activeTab === "broadcasts" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBroadcasts()}
                disabled={fetchingBroadcasts}
                className="gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${fetchingBroadcasts ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={openCreateDialog} className="gap-1.5">
                <Plus className="size-4" />
                New Broadcast Alert
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTemplatesDirty(false);
                  refetchTemplates();
                }}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
              {templatesDirty && (
                <Button variant="ghost" size="sm" onClick={handleDiscardTemplates}>
                  Discard Changes
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => saveTemplatesMutation.mutate(draftTemplates)}
                disabled={saveTemplatesMutation.isPending || !templatesDirty}
                className="gap-1.5"
              >
                {saveTemplatesMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Templates
              </Button>
            </>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "broadcasts" | "templates")} className="space-y-5">
        <TabsList>
          <TabsTrigger value="broadcasts" className="gap-2">
            <i className="ph ph-megaphone text-sm" />
            Broadcast Alerts
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {broadcastStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <i className="ph ph-bell-ringing text-sm" />
            Notification Templates
            {templatesDirty && (
              <Badge variant="warning" className="ml-1 text-[10px] px-1.5 py-0">
                Unsaved
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: BROADCAST ALERTS ────────────────────────────────────── */}
        <TabsContent value="broadcasts" className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Broadcasts"
              value={broadcastStats.total}
              variant="primary"
              icon={<i className="ph ph-megaphone text-lg" />}
            />
            <StatCard
              title="Active Now"
              value={broadcastStats.active}
              variant="success"
              icon={<i className="ph ph-broadcast text-lg" />}
            />
            <StatCard
              title="Scheduled"
              value={broadcastStats.scheduled}
              variant="info"
              icon={<i className="ph ph-calendar-check text-lg" />}
            />
            <StatCard
              title="Draft / Expired"
              value={broadcastStats.draft + broadcastStats.expired}
              variant="secondary"
              icon={<i className="ph ph-archive text-lg" />}
            />
          </div>

          {/* Filter Bar */}
          <Card className="border border-border/80 rounded-xl bg-card p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <i className="ph ph-magnifying-glass text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search broadcast title or message..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingBroadcasts ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : filteredBroadcasts.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <i className="ph ph-megaphone-simple text-3xl text-muted-foreground/60 block mx-auto" />
                <p className="text-sm font-semibold text-foreground">No broadcast alerts found</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Create a broadcast alert to display an announcement, outage notice, or maintenance banner across tenant workspaces.
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={openCreateDialog} className="gap-1.5">
                    <Plus className="size-4" />
                    Create Broadcast Alert
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border/80 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80">
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Alert
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Severity
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Audience
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Schedule Window
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Status
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredBroadcasts.map((b) => {
                      const audienceDetail =
                        b.audienceType === "all"
                          ? "All Workspaces"
                          : b.audienceType === "plans"
                          ? `${b.targetPlanIds?.length || 0} Plan(s): ${(b.targetPlanIds || [])
                              .slice(0, 2)
                              .map((id) => planNameById.get(id) || id)
                              .join(", ")}`
                          : `${b.targetTenantIds?.length || 0} Tenant(s): ${(b.targetTenantIds || [])
                              .slice(0, 2)
                              .map((id) => tenantNameById.get(id) || id)
                              .join(", ")}`;

                      return (
                        <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 max-w-md">
                            <p className="font-semibold text-foreground">{b.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {b.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span>By {b.createdBy}</span>
                              <span>·</span>
                              <span>{b.dismissible ? "Dismissible" : "Persistent"}</span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge variant={severityBadgeVariant(b.severity)} className="capitalize text-[11px]">
                              {b.severity}
                            </Badge>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <Badge variant="outline" className="capitalize text-[10px] mb-1">
                              {b.audienceType}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground truncate" title={audienceDetail}>
                              {audienceDetail}
                            </p>
                          </td>
                          <td className="p-3 whitespace-nowrap text-[11px] text-muted-foreground">
                            <div>Start: {formatDateTime(b.startsAt)}</div>
                            <div>End: {formatDateTime(b.endsAt)}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge variant={statusBadgeVariant(b.status)} className="capitalize text-[11px]">
                              {b.status}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => openEditDialog(b)}
                                className="gap-1"
                              >
                                <Pencil className="size-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setDeleteTarget(b)}
                                className="text-rose-600 hover:text-rose-600 hover:bg-rose-500/10"
                                aria-label="Delete broadcast"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB 2: NOTIFICATION TEMPLATES (EXPLICIT SAVE) ──────────────── */}
        <TabsContent value="templates" className="space-y-4">
          {templatesDirty && (
            <Alert
              variant="ghost-warning"
              icon={<i className="ph ph-info text-base leading-none" />}
              className="py-3"
            >
              <AlertTitle className="text-xs font-semibold">Unsaved template changes</AlertTitle>
              <AlertDescription className="text-xs">
                Click &ldquo;Save Templates&rdquo; in the top right to persist your edits. Edits are held locally until saved.
              </AlertDescription>
            </Alert>
          )}

          {loadingTemplates ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftTemplates.map((n) => (
                <Card key={n.id} className="p-5 border border-border/80 rounded-xl bg-card space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-semibold text-xs">
                      {n.trigger_event}
                    </Badge>
                    <Switch
                      checked={n.enabled}
                      onCheckedChange={(checked) => handleLocalTemplateChange(n.id, "enabled", checked)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Title Template</Label>
                    <Input
                      value={n.title_template}
                      onChange={(e) => handleLocalTemplateChange(n.id, "title_template", e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Body Template</Label>
                    <Textarea
                      value={n.body_template}
                      onChange={(e) => handleLocalTemplateChange(n.id, "body_template", e.target.value)}
                      rows={3}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="capitalize font-mono">Channel: {n.channel.replace("_", " ")}</span>
                    <Badge variant={n.enabled ? "success" : "secondary"} className="text-[10px]">
                      {n.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create / Edit Broadcast Dialog ───────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBroadcast ? "Edit Platform Broadcast Alert" : "Create Platform Broadcast Alert"}
            </DialogTitle>
            <DialogDescription>
              Configure a real-time alert banner delivered to matching workspaces inside the application shell.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Live Preview */}
            {(form.title.trim() || form.message.trim()) && (
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Live Banner Preview
                </Label>
                <Alert variant={previewCfg.variant} icon={previewCfg.icon} className="py-3 px-4">
                  <AlertTitle className="text-xs sm:text-sm font-semibold mb-0.5">
                    {form.title || "Broadcast Title"}
                  </AlertTitle>
                  <AlertDescription className="text-xs opacity-90 whitespace-pre-line">
                    {form.message || "Broadcast message preview..."}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Scheduled Maintenance — Sunday 02:00 IST"
                maxLength={160}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Provide clear details, impact, and expected duration for workspace users..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm((p) => ({ ...p, severity: v as BroadcastSeverity }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Audience</Label>
                <Select
                  value={form.audienceType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, audienceType: v as BroadcastAudienceType }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    <SelectItem value="plans">Specific Plans</SelectItem>
                    <SelectItem value="tenants">Specific Tenants</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as BroadcastStatus }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Auto-Schedule)</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Plans Picker */}
            {form.audienceType === "plans" && (
              <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-muted/20">
                <Label className="text-xs font-semibold">
                  Target Subscription Plans ({form.targetPlanIds.length} selected)
                </Label>
                {planOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No subscription plans found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {planOptions.map((plan) => {
                      const checked = form.targetPlanIds.includes(plan.id);
                      return (
                        <label
                          key={plan.id}
                          className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((p) => ({
                                ...p,
                                targetPlanIds: toggleSelection(p.targetPlanIds, plan.id),
                              }))
                            }
                            className="rounded border-input accent-primary"
                          />
                          <span className="truncate">{plan.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Target Tenants Picker */}
            {form.audienceType === "tenants" && (
              <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-muted/20">
                <Label className="text-xs font-semibold">
                  Target Workspaces ({form.targetTenantIds.length} selected)
                </Label>
                {tenantOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tenant workspaces found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {tenantOptions.map((tenant) => {
                      const checked = form.targetTenantIds.includes(tenant.id);
                      return (
                        <label
                          key={tenant.id}
                          className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((p) => ({
                                ...p,
                                targetTenantIds: toggleSelection(p.targetTenantIds, tenant.id),
                              }))
                            }
                            className="rounded border-input accent-primary"
                          />
                          <span className="truncate">
                            {tenant.name}{" "}
                            {tenant.slug && (
                              <span className="text-muted-foreground font-mono">({tenant.slug})</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Schedule Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Starts At</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ends At (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Allow users to dismiss</p>
                <p className="text-[11px] text-muted-foreground">
                  Dismissed banners are remembered per browser in local storage.
                </p>
              </div>
              <Switch
                checked={form.dismissible}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, dismissible: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitBroadcast}
              disabled={saveBroadcastMutation.isPending}
              className="gap-1.5"
            >
              {saveBroadcastMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {editingBroadcast ? "Save Changes" : "Publish Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Broadcast Confirmation Dialog ─────────────────────────── */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        variant="destructive"
        title="Delete broadcast alert?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.title}" and immediately hide it from all workspaces.`
            : ""
        }
        confirmLabel="Delete Broadcast"
        isLoading={deleteBroadcastMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBroadcastMutation.mutate(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
