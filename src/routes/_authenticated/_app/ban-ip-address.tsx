import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Plus, Search, Trash2, Edit2, ShieldAlert, ShieldX, Info,
  LayoutGrid, List, CheckCircle2, ShieldCheck, Globe
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AccessDenied } from "@/components/access-denied";
import { isWorkspaceAdminUser } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/_app/ban-ip-address")({
  component: BanIpAddressPage,
  head: () => ({ meta: [{ title: "Banned IP Addresses — Security Firewall" }] }),
});

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy, HH:mm"); } catch { return String(d); }
}

export function BanIpAddressPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading: isProfileLoading } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  ) || isWorkspaceAdminUser(profile);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    ipAddress: "",
    reason: "",
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: listData, isLoading, error } = useQuery({
    queryKey: ["banned-ips", search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      return api.get(`/banned-ips?${p}`);
    },
    enabled: isAdmin,
  });
  const records: any[] = listData?.data ?? [];

  if (!isProfileLoading && !isAdmin) {
    return <AccessDenied moduleName="Security Firewall" requiredPermission="system.firewall.manage" />;
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/banned-ips", data),
    onSuccess: () => {
      toast.success("IP address blocked successfully");
      qc.invalidateQueries({ queryKey: ["banned-ips"] });
      setAddOpen(false);
      setForm({ ipAddress: "", reason: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to block IP"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/banned-ips/${id}`, data),
    onSuccess: () => {
      toast.success("Banned IP record updated");
      qc.invalidateQueries({ queryKey: ["banned-ips"] });
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update record"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/banned-ips/${id}`),
    onSuccess: () => {
      toast.success("IP address unbanned / removed");
      qc.invalidateQueries({ queryKey: ["banned-ips"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove IP"),
  });

  const activeCount = records.filter(r => r.isActive).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Ban IP Address"
        description="Restrict malicious IP ranges, prevent automated scraping, and mitigate brute-force authentication attempts."
        breadcrumbs={[
          { label: "Home" },
          { label: "Security" },
          { label: "Ban IP Address" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">Table</span>
              </Button>
            </div>

            {isAdmin && (
              <Button size="sm" onClick={() => setAddOpen(true)} className="text-xs gap-1.5 h-8">
                <Plus className="size-3.5" />
                <span>Add IP Address</span>
              </Button>
            )}
          </div>
        }
      />

      {/* ─── Metric Cards ─────────────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Blocked IPs"
          value={records.length}
          icon={<ShieldX className="size-5" />}
          variant="rose"
          isLoading={isLoading}
        />
        <StatCard
          label="Active Enforcement"
          value={activeCount}
          icon={<CheckCircle2 className="size-5" />}
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          label="WAF Rule Status"
          value="Strict"
          icon={<ShieldCheck className="size-5" />}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Protocol Support"
          value="IPv4 / IPv6"
          icon={<Globe className="size-5" />}
          variant="info"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ─── Filter Toolbar ──────────────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search IP address or reason...",
        }}
      />

      {/* ─── Content: Grid vs Table ───────────────────────────────────────── */}
      {isLoading ? (
        <Card className="border bg-card p-12 text-center text-xs text-muted-foreground">
          Loading security firewall rules...
        </Card>
      ) : error ? (
        <Card className="border bg-card p-12 text-center text-xs text-destructive">
          <ShieldAlert className="size-10 mx-auto mb-2 text-destructive/80" />
          <p className="font-semibold text-foreground text-sm">Failed to Load Firewall Rules</p>
          <p className="mt-1 text-muted-foreground">{(error as any)?.message || "Please check network connectivity."}</p>
        </Card>
      ) : records.length === 0 ? (
        <Card className="border bg-card p-12 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-10 mx-auto mb-2 text-emerald-500/50" />
          <p className="font-semibold text-foreground text-sm">No IP Addresses Currently Banned</p>
          <p className="mt-1">Your application firewall is operational and no manual address restrictions are active.</p>
        </Card>
      ) : viewMode === "grid" ? (
        /* ─── Grid View ─────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {records.map((r: any) => (
            <Card key={r.id} className="border bg-card shadow-2xs hover:border-destructive/40 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                      <ShieldX className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold font-mono text-foreground leading-none">
                        {r.ipAddress}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Added: {fmtDate(r.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.5",
                        r.isActive
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {r.isActive ? "Blocked" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Reason / Violation:</p>
                  <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/50 italic">
                    "{r.reason || "No explicit reason specified"}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t">
                  <span>Enforcement: WAF Reject</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditItem(r)}
                        className="h-6 px-2 text-[10px] gap-1 hover:text-foreground"
                      >
                        <Edit2 className="size-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(r.id)}
                        className="h-6 px-2 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" />
                        <span>Unban</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Table View ─────────────────── */
        <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">IP Address</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                  <TableHead className="w-40">Date Added</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {r.ipAddress}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate" title={r.reason || ""}>
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          r.isActive
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {r.isActive ? "Blocked" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditItem(r)}
                            className="size-7"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(r.id)}
                            className="size-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── Add IP Modal ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              <span>Ban IP Address from Accessing System</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">IP Address (IPv4 or IPv6) *</Label>
              <Input
                placeholder="e.g. 192.168.1.100 or 10.0.0.1"
                value={form.ipAddress}
                onChange={(e) => setForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                className="font-mono text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Matches incoming client connection headers (x-forwarded-for, cf-connecting-ip).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Ban *</Label>
              <Textarea
                placeholder="e.g. Repeated brute force authentication failures, scraping, or malicious API probe."
                rows={3}
                value={form.reason}
                onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!form.ipAddress.trim() || !form.reason.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Blocking..." : "Ban IP Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit IP Modal ────────────────────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-primary" />
              <span>Edit Banned IP — {editItem?.ipAddress}</span>
            </DialogTitle>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">IP Address</Label>
                <Input
                  value={editItem.ipAddress}
                  onChange={(e) => setEditItem((prev: any) => ({ ...prev, ipAddress: e.target.value }))}
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reason / Violation</Label>
                <Textarea
                  rows={3}
                  value={editItem.reason}
                  onChange={(e) => setEditItem((prev: any) => ({ ...prev, reason: e.target.value }))}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!editItem) return;
                updateMutation.mutate({
                  id: editItem.id,
                  data: {
                    ipAddress: editItem.ipAddress,
                    reason: editItem.reason,
                    isActive: editItem.isActive,
                  },
                });
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Unban / Remove IP Address"
        description="Are you sure you want to remove this IP from the blacklist? Traffic originating from this address will no longer be rejected by the security layer."
        confirmLabel="Yes, Unban IP"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
          }
        }}
      />
    </div>
  );
}
