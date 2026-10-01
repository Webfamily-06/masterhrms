import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Download, Search, Trash2, Edit2, ShieldCheck,
  CheckCircle2, Clock, Users, Gift, FileText, ChevronDown, Check,
  AlertCircle, Briefcase, Building, Mail, Phone, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/referrals")({
  component: ReferralsPage,
  head: () => ({ meta: [{ title: "Employee Referrals — Master HRMS" }] }),
});

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "RF";
}

const REFERRAL_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: "Pending",
    badgeClass: "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  },
  interviewing: {
    label: "Interviewing",
    badgeClass: "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300",
  },
  hired: {
    label: "Hired",
    badgeClass: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  bonus_paid: {
    label: "Bonus Paid",
    badgeClass: "border-emerald-500 text-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

export function ReferralsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    referrerId: "",
    jobTitle: "",
    refereeName: "",
    refereeEmail: "",
    refereePhone: "",
    bonusAmount: "200",
    notes: "",
  });

  // Query Referrals
  const {
    data: referrals = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employee-referrals", search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const res = await api.get(`/api/recruitment/referrals?${params.toString()}`);
      return (res.data || []) as any[];
    },
  });

  // Query Employees (for Referrer selector)
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-referrals"],
    queryFn: async () => {
      const res = await api.get("/api/employees");
      return (res.data || []) as any[];
    },
  });

  // Filtered & Sorted
  const filteredList = useMemo(() => {
    let result = [...referrals];

    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "asc") {
      result.sort((a, b) => a.refereeName.localeCompare(b.refereeName));
    } else if (sortBy === "desc") {
      result.sort((a, b) => b.refereeName.localeCompare(a.refereeName));
    } else if (sortBy === "last7days") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      result = result.filter((r) => new Date(r.createdAt) >= cutoff);
    } else if (sortBy === "lastMonth") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter((r) => new Date(r.createdAt) >= cutoff);
    }

    return result;
  }, [referrals, sortBy]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post("/api/recruitment/referrals", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Candidate referral submitted!");
      qc.invalidateQueries({ queryKey: ["employee-referrals"] });
      setAddOpen(false);
      setForm({
        referrerId: "",
        jobTitle: "",
        refereeName: "",
        refereeEmail: "",
        refereePhone: "",
        bonusAmount: "200",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to submit referral.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/recruitment/referrals/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Referral record updated.");
      qc.invalidateQueries({ queryKey: ["employee-referrals"] });
      setEditItem(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update referral.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/recruitment/referrals/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Referral record deleted.");
      qc.invalidateQueries({ queryKey: ["employee-referrals"] });
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== deleteConfirmId));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete referral.");
    },
  });

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.error("No referral records available to export.");
      return;
    }

    const headers = [
      "Referral ID",
      "Referrer Name",
      "Referrer Department",
      "Job Referred",
      "Referee Name",
      "Referee Email",
      "Referral Bonus",
      "Status",
    ];

    const rows = filteredList.map((r) => [
      r.referralCode,
      `${r.referrer?.firstName || ""} ${r.referrer?.lastName || ""}`.trim() || "Staff",
      r.referrer?.department?.name || "General",
      r.jobTitle,
      r.refereeName,
      r.refereeEmail || "—",
      formatSystemAmount(Number(r.bonusAmount || 0)),
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employee_referrals_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Referrals exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Refferals
          </h2>
          <nav className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>Home</span>
            <span>/</span>
            <span>Recruitment</span>
            <span>/</span>
            <span className="text-foreground font-medium">Refferals</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 shadow-xs">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2 text-primary" />
                Export as CSV / Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                Print / Save PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Add Referral</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base text-foreground">Refferals List</h3>
            <Badge variant="secondary" className="font-normal text-xs px-2.5 py-0.5">
              {filteredList.length} Referrals
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search referral or candidate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs min-w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Senior IOS Developer">Senior IOS Developer</SelectItem>
                <SelectItem value="Junior PHP Developer">Junior PHP Developer</SelectItem>
                <SelectItem value="Network Engineer">Network Engineer</SelectItem>
                <SelectItem value="App Developer">App Developer</SelectItem>
                <SelectItem value="UI/UX Designer">UI/UX Designer</SelectItem>
                <SelectItem value="Graphic Designer">Graphic Designer</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs min-w-[130px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="asc">Ascending (A-Z)</SelectItem>
                <SelectItem value="desc">Descending (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      checked={
                        filteredList.length > 0 &&
                        selectedIds.length === filteredList.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Refferals ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Referrer Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Job Reffered
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Referee Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Refferals Bonus
                  </TableHead>
                  <TableHead className="w-20 text-right pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Loading referral records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center text-destructive">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-sm font-medium">
                          Failed to load referrals: {(error as any)?.message || "Unknown error"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Gift className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                        <p className="font-medium text-sm text-foreground">No candidate referrals registered</p>
                        <p className="text-xs">
                          {search
                            ? "Try refining your search terms."
                            : "Employees can submit talent referrals for open career opportunities."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    const referrerName = `${row.referrer?.firstName || ""} ${row.referrer?.lastName || ""}`.trim() || "Staff Member";

                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(row.id)}
                          />
                        </TableCell>

                        {/* Referral ID */}
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {row.referralCode}
                        </TableCell>

                        {/* Referrer Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/80">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {getInitials(row.referrer?.firstName, row.referrer?.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground leading-tight">
                                {referrerName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.referrer?.department?.name || "General Department"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Job Referred */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded bg-muted/60 flex items-center justify-center text-muted-foreground flex-shrink-0">
                              <Briefcase className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {row.jobTitle}
                            </span>
                          </div>
                        </TableCell>

                        {/* Referee Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border/60">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                                {getInitials(row.refereeName?.split(" ")?.[0], row.refereeName?.split(" ")?.[1])}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground leading-tight">
                                {row.refereeName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.refereeEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Referral Bonus */}
                        <TableCell className="font-semibold text-sm text-foreground">
                          {formatSystemAmount(Number(row.bonusAmount || 0))}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit Referral"
                              onClick={() => setEditItem(row)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Delete Referral"
                                onClick={() => setDeleteConfirmId(row.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </CardContent>
      </Card>

      {/* MODAL 1: Add Referral */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Add Candidate Referral
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.referrerId) {
                toast.error("Please select the referring employee.");
                return;
              }
              if (!form.jobTitle.trim() || !form.refereeName.trim()) {
                toast.error("Job Title and Referee Name are required.");
                return;
              }
              createMutation.mutate(form);
            }}
            className="space-y-4 pt-1"
          >
            {/* Referrer Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Referring Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.referrerId}
                onValueChange={(val) => setForm({ ...form, referrerId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Referring Employee" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Job Opening Referred <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Senior IOS Developer"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {/* Referee Name & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Referee Candidate Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Harold Gaynor"
                  value={form.refereeName}
                  onChange={(e) => setForm({ ...form, refereeName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Referee Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="harold@example.com"
                  value={form.refereeEmail}
                  onChange={(e) => setForm({ ...form, refereeEmail: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Referee Phone & Bonus */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Referee Phone Number</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={form.refereePhone}
                  onChange={(e) => setForm({ ...form, refereePhone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Referral Bonus (Amount)</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={form.bonusAmount}
                  onChange={(e) => setForm({ ...form, bonusAmount: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Submitting..." : "Submit Referral"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Referral */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Edit Referral Details
            </DialogTitle>
          </DialogHeader>

          {editItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editItem.id,
                  data: editItem,
                });
              }}
              className="space-y-4 pt-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold">Job Title</Label>
                  <Input
                    value={editItem.jobTitle}
                    onChange={(e) =>
                      setEditItem({ ...editItem, jobTitle: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Referee Name</Label>
                  <Input
                    value={editItem.refereeName}
                    onChange={(e) =>
                      setEditItem({ ...editItem, refereeName: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Referee Email</Label>
                  <Input
                    type="email"
                    value={editItem.refereeEmail}
                    onChange={(e) =>
                      setEditItem({ ...editItem, refereeEmail: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bonus Amount</Label>
                  <Input
                    type="number"
                    value={editItem.bonusAmount}
                    onChange={(e) =>
                      setEditItem({ ...editItem, bonusAmount: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select
                    value={editItem.status}
                    onValueChange={(val) =>
                      setEditItem({ ...editItem, status: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="interviewing">Interviewing</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="bonus_paid">Bonus Paid</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center justify-center p-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold">Confirm Delete</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Are you sure you want to delete this referral record? This cannot be undone once deleted.
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
