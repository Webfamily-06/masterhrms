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
  Plus, Download, Search, Trash2, Edit2, ShieldCheck,
  CheckCircle2, Clock, Users, GraduationCap, FileText, ChevronDown, Check,
  AlertCircle, Briefcase, Building, Mail, Phone, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/campus-hiring")({
  component: CampusHiringPage,
  head: () => ({ meta: [{ title: "Campus Hiring — Master HRMS" }] }),
});

function getInitials(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "ST";
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  Applied: {
    label: "Applied",
    badgeClass: "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300",
  },
  "In progress": {
    label: "In progress",
    badgeClass: "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  },
  Shortlisted: {
    label: "Shortlisted",
    badgeClass: "border-pink-300 text-pink-700 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-300",
  },
  Selected: {
    label: "Selected",
    badgeClass: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  Rejected: {
    label: "Rejected",
    badgeClass: "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

export function CampusHiringPage() {
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
  const [editCandidate, setEditCandidate] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    studentName: "",
    email: "",
    phone: "",
    collegeName: "",
    branch: "B.E/CSE",
    graduationYear: "2025",
    jobRole: "App Developer",
    recruiterName: "",
    status: "Applied",
  });

  // Query Campus Candidates
  const {
    data: candidates = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["campus-candidates", search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const res = await api.get(`/api/recruitment/campus-candidates?${params.toString()}`);
      return (res.data || []) as any[];
    },
  });

  // Query Recruiters (Staff for recruiter field)
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-recruiter"],
    queryFn: async () => {
      const res = await api.get("/api/employees");
      return (res.data || []) as any[];
    },
  });

  // Filtered & Sorted
  const filteredList = useMemo(() => {
    let result = [...candidates];

    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "asc") {
      result.sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else if (sortBy === "desc") {
      result.sort((a, b) => b.studentName.localeCompare(a.studentName));
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
  }, [candidates, sortBy]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post("/api/recruitment/campus-candidates", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Candidate added to campus drive!");
      qc.invalidateQueries({ queryKey: ["campus-candidates"] });
      setAddOpen(false);
      setForm({
        studentName: "",
        email: "",
        phone: "",
        collegeName: "",
        branch: "B.E/CSE",
        graduationYear: "2025",
        jobRole: "App Developer",
        recruiterName: "",
        status: "Applied",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to add candidate.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/recruitment/campus-candidates/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Candidate record updated.");
      qc.invalidateQueries({ queryKey: ["campus-candidates"] });
      setEditCandidate(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update candidate.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/recruitment/campus-candidates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Candidate record removed from drive.");
      qc.invalidateQueries({ queryKey: ["campus-candidates"] });
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== deleteConfirmId));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete candidate.");
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
      toast.error("No campus hiring records to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Email Address",
      "Phone",
      "College / University",
      "Branch",
      "Graduation Year",
      "Job Role",
      "Recruiter Name",
      "Status",
    ];

    const rows = filteredList.map((r) => [
      r.studentName,
      r.email || "—",
      r.phone || "—",
      r.collegeName || "—",
      r.branch,
      r.graduationYear,
      r.jobRole,
      r.recruiterName || "—",
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
    link.setAttribute("download", `campus_hiring_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Campus candidates exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Campus Hiring
          </h2>
          <nav className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>Home</span>
            <span>/</span>
            <span>Recruitment</span>
            <span>/</span>
            <span className="text-foreground font-medium">Campus Hiring</span>
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
              <span>Add New Candidate</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Students List Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base text-foreground">Students List</h3>
            <Badge variant="secondary" className="font-normal text-xs px-2.5 py-0.5">
              {filteredList.length} Candidates
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search candidate or college..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs min-w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="App Developer">App Developer</SelectItem>
                <SelectItem value="Web Developer">Web Developer</SelectItem>
                <SelectItem value="Accountant">Accountant</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
                <SelectItem value="Sales Executive">Sales Executive</SelectItem>
                <SelectItem value="Business Analyst">Business Analyst</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs min-w-[130px]">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                <SelectItem value="Selected">Selected</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
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
                    Student Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Branch
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Graduation Year
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Job Role
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recruiter Name
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
                        <span className="text-sm">Loading campus candidates...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-36 text-center text-destructive">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-sm font-medium">
                          Failed to load campus candidates: {(error as any)?.message || "Unknown error"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                        <p className="font-medium text-sm text-foreground">No students in campus drive</p>
                        <p className="text-xs">
                          {search
                            ? "Try refining your search filters."
                            : "Add candidates from university placement recruitment drives."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    const cfg = STATUS_CONFIG[row.status] || {
                      label: row.status,
                      badgeClass: "border-gray-200 text-gray-700 bg-gray-50",
                    };

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

                        {/* Student Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/80">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {getInitials(row.studentName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground leading-tight">
                                {row.studentName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.email || "No email"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Branch */}
                        <TableCell className="text-sm font-medium text-foreground">
                          {row.branch}
                        </TableCell>

                        {/* Graduation Year */}
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {row.graduationYear}
                        </TableCell>

                        {/* Job Role */}
                        <TableCell className="text-sm font-medium text-foreground">
                          {row.jobRole}
                        </TableCell>

                        {/* Recruiter Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 border border-border/60">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                                {getInitials(row.recruiterName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">
                              {row.recruiterName || "Internal HR"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              cfg.badgeClass
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {cfg.label}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Edit Candidate"
                                  onClick={() => setEditCandidate(row)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Delete Candidate"
                                  onClick={() => setDeleteConfirmId(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* MODAL 1: Add New Candidate */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Add New Candidate
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.studentName.trim()) {
                toast.error("Candidate Name is required.");
                return;
              }
              createMutation.mutate(form);
            }}
            className="space-y-4 pt-1"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Harold Gaynor"
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="harold@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch</Label>
                <Input
                  placeholder="e.g. B.E/CSE, B.Tech/IT"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Graduation Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="2025"
                  value={form.graduationYear}
                  onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Job Role</Label>
                <Input
                  placeholder="e.g. App Developer"
                  value={form.jobRole}
                  onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recruiter Name</Label>
                <Input
                  placeholder="e.g. Anthony Lewis"
                  value={form.recruiterName}
                  onChange={(e) => setForm({ ...form, recruiterName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Applied">Applied</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="Selected">Selected</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
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
                {createMutation.isPending ? "Adding..." : "Add Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Candidate */}
      <Dialog open={!!editCandidate} onOpenChange={(open) => !open && setEditCandidate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Edit Candidate
            </DialogTitle>
          </DialogHeader>

          {editCandidate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editCandidate.id,
                  data: editCandidate,
                });
              }}
              className="space-y-4 pt-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold">Name</Label>
                  <Input
                    value={editCandidate.studentName}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, studentName: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    value={editCandidate.email || ""}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, email: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Branch</Label>
                  <Input
                    value={editCandidate.branch}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, branch: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Graduation Year</Label>
                  <Input
                    value={editCandidate.graduationYear}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, graduationYear: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Job Role</Label>
                  <Input
                    value={editCandidate.jobRole}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, jobRole: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Recruiter Name</Label>
                  <Input
                    value={editCandidate.recruiterName || ""}
                    onChange={(e) =>
                      setEditCandidate({ ...editCandidate, recruiterName: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select
                    value={editCandidate.status}
                    onValueChange={(val) =>
                      setEditCandidate({ ...editCandidate, status: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="Selected">Selected</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditCandidate(null)}
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
              Are you sure you want to remove this student candidate from the campus recruitment drive?
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
