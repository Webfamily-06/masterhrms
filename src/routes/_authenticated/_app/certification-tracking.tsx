import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
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
  Plus, Download, Search, Trash2, Eye, ShieldCheck,
  CheckCircle2, Clock, Award, FileText, ChevronDown, Check, Sparkles, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/certification-tracking")({
  component: CertificationTrackingPage,
  head: () => ({ meta: [{ title: "Certification Tracking — Master HRMS" }] }),
});

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "CT";
}

function formatDate(dateStr?: string | Date | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CertificationTrackingPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const isAdmin = (profile?.roles ?? []).some((r: string) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [viewCertItem, setViewCertItem] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    employeeId: "",
    courseId: "",
    certifiedAt: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    certificateId: "",
    score: "100",
  });

  // Fetch Certifications
  const {
    data: certs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["training-certifications", search],
    queryFn: async () => {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await api.get(`/api/training/certifications${q}`);
      return (res.data || []) as any[];
    },
  });

  // Fetch Courses for dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ["training-courses-list"],
    queryFn: async () => {
      const res = await api.get("/api/training/courses");
      return (res.data || []) as any[];
    },
  });

  // Fetch Employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-cert"],
    queryFn: async () => {
      const res = await api.get("/api/employees");
      return (res.data || []) as any[];
    },
  });

  // Selected Course helper
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === form.courseId),
    [courses, form.courseId]
  );

  // Selected Employee helper
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === form.employeeId),
    [employees, form.employeeId]
  );

  // Filtered & Sorted Certifications
  const filteredCerts = useMemo(() => {
    let result = [...certs];

    if (sortBy === "recent") {
      result.sort(
        (a, b) =>
          new Date(b.certifiedAt || b.createdAt).getTime() -
          new Date(a.certifiedAt || a.createdAt).getTime()
      );
    } else if (sortBy === "asc") {
      result.sort((a, b) => {
        const nameA = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.trim();
        const nameB = `${b.employee?.firstName || ""} ${b.employee?.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === "desc") {
      result.sort((a, b) => {
        const nameA = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.trim();
        const nameB = `${b.employee?.firstName || ""} ${b.employee?.lastName || ""}`.trim();
        return nameB.localeCompare(nameA);
      });
    } else if (sortBy === "last7days") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      result = result.filter(
        (r) => new Date(r.certifiedAt || r.createdAt) >= cutoff
      );
    } else if (sortBy === "lastMonth") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter(
        (r) => new Date(r.certifiedAt || r.createdAt) >= cutoff
      );
    }

    return result;
  }, [certs, sortBy]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post("/api/training/certifications", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Certification issued successfully!");
      qc.invalidateQueries({ queryKey: ["training-certifications"] });
      setAddOpen(false);
      setForm({
        employeeId: "",
        courseId: "",
        certifiedAt: new Date().toISOString().split("T")[0],
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        certificateId: "",
        score: "100",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to issue certification.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/training/certifications/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Certification record revoked successfully.");
      qc.invalidateQueries({ queryKey: ["training-certifications"] });
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmId));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to revoke certification.");
    },
  });

  // Bulk Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCerts.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // CSV Export with escaping
  const handleExportCSV = () => {
    if (filteredCerts.length === 0) {
      toast.error("No certification records available to export.");
      return;
    }

    const headers = [
      "Certificate ID",
      "Employee Name",
      "Department",
      "Training Type",
      "Trainer Name",
      "Date Certified",
      "Expiry Date",
      "Score",
      "Status",
    ];

    const rows = filteredCerts.map((r) => [
      r.certificateId || "—",
      `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim() || "—",
      r.employee?.department?.name || "—",
      r.course?.title || "—",
      r.course?.instructor || "Internal Academy",
      formatDate(r.certifiedAt),
      formatDate(r.expiryDate),
      `${r.score ?? 100}%`,
      r.status === "completed" ? "Issued" : r.status,
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
    link.setAttribute("download", `certification_tracking_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Certifications exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header matching ui-2/certification-tracking.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Certification Tracking
          </h2>
          <nav className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>Home</span>
            <span>/</span>
            <span>Training</span>
            <span>/</span>
            <span className="text-foreground font-medium">Certification Tracking</span>
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

          {isAdmin && (
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Add New Certification</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base text-foreground">Certification List</h3>
            <Badge variant="secondary" className="font-normal text-xs px-2.5 py-0.5">
              {filteredCerts.length} Issued
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cert or employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs min-w-[150px]">
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
                        filteredCerts.length > 0 &&
                        selectedIds.length === filteredCerts.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Employee Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Training Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Trainer Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Certificate ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-20 text-right pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Loading certification records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-36 text-center text-destructive">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-sm font-medium">
                          Failed to load certifications: {(error as any)?.message || "Unknown error"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Award className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                        <p className="font-medium text-sm text-foreground">No certifications found</p>
                        <p className="text-xs">
                          {search
                            ? "Try refining your search term or clearing filters."
                            : "Issue certifications to employees upon training course completion."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCerts.map((row) => {
                    const empName = `${row.employee?.firstName || ""} ${row.employee?.lastName || ""}`.trim() || "Unknown Employee";
                    const isSelected = selectedIds.includes(row.id);

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

                        {/* Employee Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/80">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {getInitials(row.employee?.firstName, row.employee?.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground hover:text-primary cursor-pointer leading-tight">
                                {empName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.employee?.department?.name || "General"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Training Type */}
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">
                            {row.course?.title || "Specialized Training"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {row.course?.category || "Professional Development"}
                          </span>
                        </TableCell>

                        {/* Trainer Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 border border-border/60">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                                {getInitials(row.course?.instructor?.split(" ")?.[0], row.course?.instructor?.split(" ")?.[1])}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">
                              {row.course?.instructor || "Internal Academy"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Certificate ID */}
                        <TableCell>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/60">
                            {row.certificateId || "CERT-PENDING"}
                          </span>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(row.certifiedAt)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Issued
                          </span>
                        </TableCell>

                        {/* Action Icons */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View Certificate"
                              onClick={() => setViewCertItem(row)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Download Credential"
                              onClick={() => setViewCertItem(row)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Revoke Certificate"
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

      {/* MODAL 1: Add New Certification */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Add Certification
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId) {
                toast.error("Please select an employee.");
                return;
              }
              if (!form.courseId) {
                toast.error("Please select a training course.");
                return;
              }
              createMutation.mutate(form);
            }}
            className="space-y-4 pt-1"
          >
            {/* Employee Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Employee Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.employeeId}
                onValueChange={(val) => setForm({ ...form, employeeId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Employee" />
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

            {/* Auto-populated Designation */}
            {selectedEmployee && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Department / Role</Label>
                <Input
                  disabled
                  value={`${selectedEmployee.department?.name || "Standard Operations"} · ${selectedEmployee.employeeCode || "Active Staff"}`}
                  className="h-9 text-xs bg-muted/50"
                />
              </div>
            )}

            {/* Training Course Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Training Type / Course <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.courseId}
                onValueChange={(val) => setForm({ ...form, courseId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Training Course" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {courses.map((crs) => (
                    <SelectItem key={crs.id} value={crs.id}>
                      {crs.title} ({crs.instructor || "Internal"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trainer Name Display / Auto-population */}
            {selectedCourse && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Trainer Name</Label>
                <Input
                  disabled
                  value={selectedCourse.instructor || "Internal Academy"}
                  className="h-9 text-xs bg-muted/50"
                />
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Certificate Issue Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.certifiedAt}
                  onChange={(e) => setForm({ ...form, certifiedAt: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expiration Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Custom Certificate ID (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Certificate ID (Leave empty to auto-generate)
              </Label>
              <Input
                placeholder="e.g. CERT-2026-9042"
                value={form.certificateId}
                onChange={(e) => setForm({ ...form, certificateId: e.target.value })}
                className="h-9 text-xs font-mono"
              />
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
                {createMutation.isPending ? "Issuing..." : "Add Certification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: View Certificate Modal */}
      <Dialog open={!!viewCertItem} onOpenChange={(open) => !open && setViewCertItem(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10 border-b relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-amber-500" />
                <h4 className="text-base font-bold tracking-tight">Verified Credential</h4>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-background/80 border font-semibold">
                {viewCertItem?.certificateId || "CERT-XXXX"}
              </span>
            </div>

            {/* Certificate Template Card */}
            <div className="mt-6 border-2 border-amber-500/30 rounded-xl p-8 bg-card shadow-lg text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-primary to-emerald-500" />

              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600 mb-3">
                <Award className="h-10 w-10" />
              </div>

              <h2 className="text-xl font-serif font-bold text-foreground uppercase tracking-widest">
                Certificate of Completion
              </h2>
              <p className="text-xs text-muted-foreground mt-1">This document certifies that</p>

              <h3 className="text-2xl font-serif font-semibold text-primary mt-3 underline decoration-amber-400/50 underline-offset-8">
                {viewCertItem?.employee
                  ? `${viewCertItem.employee.firstName} ${viewCertItem.employee.lastName}`
                  : "Recipient"}
              </h3>

              <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto">
                has successfully completed the comprehensive training program and met all statutory competency assessments for:
              </p>

              <h4 className="text-lg font-bold text-foreground mt-2">
                {viewCertItem?.course?.title || "Professional Enterprise Training"}
              </h4>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/80 text-xs">
                <div>
                  <p className="text-muted-foreground">Certified Instructor</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {viewCertItem?.course?.instructor || "Internal Academy Faculty"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatDate(viewCertItem?.certifiedAt)}
                  </p>
                </div>
              </div>

              {viewCertItem?.expiryDate && (
                <p className="text-[11px] text-muted-foreground mt-4">
                  Valid Until: <span className="font-medium text-foreground">{formatDate(viewCertItem.expiryDate)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-muted/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Cryptographically registered to tenant audit ledger
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewCertItem(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground"
                onClick={() => {
                  window.print();
                }}
              >
                <Download className="h-4 w-4" />
                Download / Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Delete / Revoke Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center justify-center p-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold">Confirm Revoke</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Are you sure you want to revoke this certification? This action will permanently remove the credential from the audit register.
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
              {deleteMutation.isPending ? "Revoking..." : "Yes, Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
