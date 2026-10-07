import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Eye,
  Trash2,
  MessageSquare,
  RotateCw,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/call-history")({
  component: CallHistoryPage,
  head: () => ({ meta: [{ title: "Call History — Master ERP" }] }),
});

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "00.00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}.${secs.toString().padStart(2, "0")}`;
}

function fmtCallDate(d: string | null | undefined) {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd MMM yyyy, hh:mm a");
  } catch {
    return String(d);
  }
}

export function CallHistoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewCaller, setViewCaller] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ─── Query ────────────────────────────────────────────────────────────────
  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-calls", search, callTypeFilter, sortOrder],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (callTypeFilter && callTypeFilter !== "all") p.append("callType", callTypeFilter);
      p.append("sort", sortOrder);
      const res = await api.get(`/crm/calls?${p.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/crm/calls/${id}`),
    onSuccess: () => {
      toast.success("Call record removed");
      qc.invalidateQueries({ queryKey: ["crm-calls"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete record"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post("/crm/calls/bulk-delete", { ids }),
    onSuccess: (res: any) => {
      toast.success(`${res?.count || selectedIds.length} call records deleted`);
      qc.invalidateQueries({ queryKey: ["crm-calls"] });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to bulk delete"),
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(calls.map((c: any) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Call History"
        description="Omnichannel call logs, voice/video interaction durations, and telephony activity."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Calls" },
          { label: "Call History" },
        ]}
        icon={<Phone className="size-5 text-primary" />}
        actions={
          <>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="text-xs gap-1.5 h-8"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Marked ({selectedIds.length})</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs gap-1.5 h-8"
            >
              <RotateCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
          </>
        }
      />

      {/* ── Filter Toolbar ── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search name, phone...",
        }}
        filters={
          <>
            <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
              <SelectTrigger className="h-8.5 text-xs w-36">
                <SelectValue placeholder="Call Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Call Types</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
                <SelectItem value="missed">Missed Call</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v: "desc" | "asc") => setSortOrder(v)}>
              <SelectTrigger className="h-8.5 text-xs w-40">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Sort By : Newest</SelectItem>
                <SelectItem value="asc">Sort By : Oldest</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* ─── Call History Table ── */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <RotateCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            Loading call logs...
          </div>
        ) : calls.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No call history records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={
                        selectedIds.length > 0 && selectedIds.length === calls.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call: any) => {
                  const isSelected = selectedIds.includes(call.id);
                  const isIncoming = call.callType === "incoming";
                  const isOutgoing = call.callType === "outgoing";
                  const isMissed = call.callType === "missed";
                  const isVideo = call.callType === "video";

                  return (
                    <TableRow key={call.id} className="hover:bg-muted/40">
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(call.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setViewCaller(call)}
                            className="size-9 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border hover:opacity-80"
                          >
                            {call.callerAvatarUrl ? (
                              <img
                                src={call.callerAvatarUrl}
                                alt={call.callerName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <User className="size-4 text-muted-foreground" />
                            )}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => setViewCaller(call)}
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors text-left block"
                            >
                              {call.callerName}
                            </button>
                            <span className="text-[11px] text-muted-foreground block">
                              {call.callerEmail || "-"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {call.callerPhone}
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center text-xs font-medium gap-1.5">
                          {isIncoming && (
                            <>
                              <PhoneIncoming className="size-3.5 text-emerald-600" />
                              <span className="text-emerald-700 dark:text-emerald-400">Incoming</span>
                            </>
                          )}
                          {isOutgoing && (
                            <>
                              <PhoneOutgoing className="size-3.5 text-blue-600" />
                              <span className="text-blue-700 dark:text-blue-400">Outgoing</span>
                            </>
                          )}
                          {isMissed && (
                            <>
                              <PhoneMissed className="size-3.5 text-rose-600" />
                              <span className="text-rose-700 dark:text-rose-400">Missed Call</span>
                            </>
                          )}
                          {isVideo && (
                            <>
                              <Video className="size-3.5 text-purple-600" />
                              <span className="text-purple-700 dark:text-purple-400">Video Call</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatDuration(call.durationSeconds)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtCallDate(call.callTime)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="View Caller Details"
                            onClick={() => setViewCaller(call)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Record"
                            onClick={() => setDeleteConfirmId(call.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Caller Details Modal ── */}
      {viewCaller && (
        <Dialog open={!!viewCaller} onOpenChange={() => setViewCaller(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Caller Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Profile Card Header */}
              <div className="p-4 rounded-xl bg-muted/40 border text-center space-y-3">
                <div className="size-16 rounded-full mx-auto overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center">
                  {viewCaller.callerAvatarUrl ? (
                    <img
                      src={viewCaller.callerAvatarUrl}
                      alt={viewCaller.callerName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="size-8 text-muted-foreground" />
                  )}
                </div>

                {/* Quick Communication Actions */}
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
                    title="Video Call"
                    onClick={() => toast.info(`Starting video call with ${viewCaller.callerName}...`)}
                  >
                    <Video className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
                    title="Chat"
                    onClick={() => toast.info(`Opening chat thread with ${viewCaller.callerName}...`)}
                  >
                    <MessageSquare className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
                    title="Voice Call"
                    onClick={() => toast.info(`Dialing ${viewCaller.callerPhone}...`)}
                  >
                    <Phone className="size-4" />
                  </Button>
                </div>
              </div>

              {/* 6-Grid Caller Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Name</p>
                  <h6 className="font-semibold text-foreground text-xs">
                    {viewCaller.callerName}
                  </h6>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Total Calls</p>
                  <h6 className="font-semibold text-foreground text-xs">
                    {viewCaller.totalCalls || 1}
                  </h6>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Phone</p>
                  <h6 className="font-semibold text-foreground text-xs">
                    {viewCaller.callerPhone}
                  </h6>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Average Call Timing</p>
                  <h6 className="font-semibold text-foreground text-xs font-mono">
                    {formatDuration(viewCaller.avgCallSeconds || 30)}
                  </h6>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Email</p>
                  <h6 className="font-semibold text-foreground text-xs truncate">
                    {viewCaller.callerEmail || "-"}
                  </h6>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Average Waiting Time</p>
                  <h6 className="font-semibold text-foreground text-xs font-mono">
                    {formatDuration(viewCaller.avgWaitSeconds || 5)}
                  </h6>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewCaller(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Delete Single Record Confirmation ── */}
      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Confirm Delete"
        description="Are you sure you want to delete this call history log? This cannot be undone once deleted."
        confirmLabel="Yes, Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => { if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId); }}
      />

      {/* ─── Bulk Delete Confirmation ── */}
      <ConfirmationDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Marked Records"
        description={`Are you sure you want to delete all ${selectedIds.length} marked call records?`}
        confirmLabel="Confirm Bulk Delete"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
      />
    </div>
  );
}
