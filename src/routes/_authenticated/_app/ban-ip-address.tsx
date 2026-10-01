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
import {
  Plus, Search, Trash2, Edit2, ShieldAlert, ShieldX, Info,
  LayoutGrid, List, CheckCircle2, ShieldCheck, Globe
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

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
  });
  const records: any[] = listData?.data ?? [];

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
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="size-6 text-destructive" />
            <span>Ban IP Address — Security Access Control</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restrict malicious IP ranges, prevent automated scraping, and mitigate brute-force authentication attempts.
          </p>
        </div>

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
      </div>

      {/* ─── Metric Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Blocked IPs</p>
            <ShieldX className="size-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{records.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configured firewall rules</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-600">Active Enforcement</p>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{activeCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Currently rejected requests</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-600">WAF Rule Status</p>
            <ShieldCheck className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">Strict</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Tenant boundary isolation</p>
        </Card>

        <Card className="border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-600">Protocol Support</p>
            <Globe className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">IPv4 / IPv6</p>
          <p className="text-[11px] text-blue-600 mt-0.5">CIDR subnet matches</p>
        </Card>
      </div>

      {/* ─── Search Bar ──────────────────────────────────────────────────── */}
      <Card className="border bg-card p-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IP address or reason..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </Card>

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
        /* ─── Grid View (Matches ui-2/ban-ip-address.html) ─────────────────── */
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
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.isActive ? "Banned" : "Inactive"}
                    </Badge>

                    {isAdmin && (
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditItem({ id: r.id, ipAddress: r.ipAddress, reason: r.reason || "", isActive: r.isActive })}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(r.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {r.reason || "No explicit reason provided. Blocked via tenant security policy."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Table View ─────────────────────────────────────────────────── */
        <Card className="border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-semibold">IP Address</TableHead>
                <TableHead className="text-xs font-semibold">Reason / Violation</TableHead>
                <TableHead className="text-xs font-semibold">Added On</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldX className="size-3.5 text-destructive" />
                      <span>{r.ipAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md">
                    {r.reason || "Automatic firewall block"}
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
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.isActive ? "Banned" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditItem({ id: r.id, ipAddress: r.ipAddress, reason: r.reason || "", isActive: r.isActive })}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(r.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Add IP Modal ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              <span>Add New Banned IP Address</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">IP Address / Host *</Label>
              <Input
                value={form.ipAddress}
                onChange={(e) => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                placeholder="e.g. 198.162.1.20 or 10.0.0.0/24"
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason / Violation Summary</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Repeated unauthorized login attempts from suspicious geolocation."
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
              disabled={createMutation.isPending || !form.ipAddress.trim()}
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
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              <span>Unban / Remove IP Address</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to remove this IP from the blacklist? Traffic originating from this address will no longer be rejected by the security layer.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? "Removing..." : "Yes, Unban IP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
