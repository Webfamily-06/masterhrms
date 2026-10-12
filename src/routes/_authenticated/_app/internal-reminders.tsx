import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Bell,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  AlertCircle,
  Calendar,
  Sparkles,
  Loader2,
  Trash2,
  Filter,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/internal-reminders")({
  component: InternalRemindersPage,
  head: () => ({
    meta: [{ title: "Internal Reminders & Contextual Alerts — Master ERP" }],
  }),
});

interface ReminderItem {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  reminderType: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "COMPLETED" | "DISMISSED";
  dueAt: string;
  createdAt: string;
  createdBy?: string;
}

export function InternalRemindersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "COMPLETED" | "DISMISSED" | "ALL">("PENDING");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formEntityType, setFormEntityType] = useState("invoice");
  const [formEntityId, setFormEntityId] = useState("");
  const [formReminderType, setFormReminderType] = useState("payment_due");
  const [formMessage, setFormMessage] = useState("");
  const [formPriority, setFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [formDueAt, setFormDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });

  // 1. Fetch reminders
  const { data: reminders = [], isLoading, refetch } = useQuery<ReminderItem[]>({
    queryKey: ["tenant-reminders"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/internal-reminders");
        const list = Array.isArray(res) ? res : res?.reminders || [];
        return list.map((r: any) => ({
          ...r,
          message: r.message || r.title || r.notes || "",
          dueAt: r.dueAt || r.dueDate || "",
          status: r.status || (r.completed ? "COMPLETED" : "PENDING"),
        }));
      } catch {
        return [];
      }
    },
    staleTime: 5000,
  });

  // 2. Create reminder mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/internal-reminders", {
        entityType: formEntityType,
        entityId: formEntityId.trim() || `GEN-${Date.now()}`,
        reminderType: formReminderType,
        message: formMessage.trim(),
        priority: formPriority,
        dueAt: new Date(formDueAt).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Reminder created successfully!");
      setShowCreateModal(false);
      setFormMessage("");
      setFormEntityId("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create reminder.");
    },
  });

  // 3. Mark complete mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/internal-reminders/${id}/complete`);
    },
    onSuccess: () => {
      toast.success("Reminder marked as completed.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update reminder.");
    },
  });

  // 4. Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/internal-reminders/${id}/dismiss`);
    },
    onSuccess: () => {
      toast.success("Reminder dismissed.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dismiss reminder.");
    },
  });

  // 5. Automated due date scanner mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ created: number; scanned: number }>("/internal-reminders/scan-due-dates");
    },
    onSuccess: (data) => {
      toast.success(`Automated scanner provisioned ${data?.created ?? 0} contextual reminders!`);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to run automated due date scanner.");
    },
  });

  // Filtered list
  const filtered = reminders.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || r.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (p: ReminderItem["priority"]) => {
    switch (p) {
      case "URGENT":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px]">HIGH</Badge>;
      case "MEDIUM":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-[10px]">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="font-semibold text-[10px]">LOW</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Internal Reminders & Alerts</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E10 Audit Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Contextual entity-linked reminders, automated due-date watchers, and team notification triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-bold gap-1.5"
            disabled={scanMutation.isPending}
            onClick={() => scanMutation.mutate()}
          >
            {scanMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 text-primary" />
            )}
            Run Due-Date Scanner
          </Button>

          <Button
            size="sm"
            className="text-xs font-bold gap-1.5 shadow-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="size-4" /> Create Reminder
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Status:</span>
          {(["PENDING", "COMPLETED", "DISMISSED", "ALL"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 font-semibold capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s.toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Priority:</span>
          {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2 font-semibold"
              onClick={() => setPriorityFilter(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <Card className="p-16 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading reminders...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2">
          <Bell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-foreground">No Reminders Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No reminders match the current filter. Create a manual reminder or run the automated scanner.
          </p>
          <Button size="sm" className="mt-4 font-bold" onClick={() => setShowCreateModal(true)}>
            Create New Reminder
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border shadow-xs transition-colors ${
                r.status === "COMPLETED" ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(r.priority)}
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">
                    {r.entityType}: {r.entityId}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-3 text-primary" /> Due: {new Date(r.dueAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-snug">{r.message}</p>
              </div>

              {r.status === "PENDING" && (
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold gap-1 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                    onClick={() => completeMutation.mutate(r.id)}
                  >
                    <CheckCircle2 className="size-3.5" /> Mark Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    onClick={() => dismissMutation.mutate(r.id)}
                  >
                    <XCircle className="size-3.5" /> Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* CREATE REMINDER MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="size-4 text-primary" /> Create Internal Reminder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provision a contextual task notification linked to an invoice, contract, or team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Entity Type</Label>
                <Select value={formEntityType} onValueChange={setFormEntityType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="lead">CRM Lead</SelectItem>
                    <SelectItem value="general">General Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={formPriority} onValueChange={(v: any) => setFormPriority(v)}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reference ID (e.g. INV-1002, EMP-401)</Label>
              <Input
                placeholder="INV-1002"
                value={formEntityId}
                onChange={(e) => setFormEntityId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reminder Message & Details</Label>
              <Textarea
                placeholder="Follow up on pending disbursement approval before month-end payroll cutoff..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!formMessage.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="font-bold"
            >
              {createMutation.isPending ? "Creating..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InternalRemindersPage;
