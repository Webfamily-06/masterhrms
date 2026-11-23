'use client';

import { useState, useMemo } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function getInitials(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "ST";
}

export default function HrCampusHiringPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

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
    data: candidatesData,
    isLoading,
  } = useQuery({
    queryKey: ["hr-campus-candidates", search, roleFilter, statusFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.append("search", search.trim());
        if (roleFilter !== "all") params.append("role", roleFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);
        const res: any = await api.get(`/api/recruitment/campus-candidates?${params.toString()}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const candidates: any[] = Array.isArray(candidatesData) ? candidatesData : [];

  // Query Recruiters
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-recruiter-mini"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/employees");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const employees: any[] = Array.isArray(employeesData) ? employeesData : [];

  // Filtered & Sorted
  const filteredList = useMemo(() => {
    let result = [...candidates];

    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === "asc") {
      result.sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
    } else if (sortBy === "desc") {
      result.sort((a, b) => (b.studentName || "").localeCompare(a.studentName || ""));
    }

    return result;
  }, [candidates, sortBy]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post("/api/recruitment/campus-candidates", payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Candidate enrolled in campus recruitment drive!");
      qc.invalidateQueries({ queryKey: ["hr-campus-candidates"] });
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
      return await api.put(`/api/recruitment/campus-candidates/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Candidate record updated.");
      qc.invalidateQueries({ queryKey: ["hr-campus-candidates"] });
      setEditCandidate(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update candidate.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/recruitment/campus-candidates/${id}`);
    },
    onSuccess: () => {
      toast.success("Candidate record removed from drive.");
      qc.invalidateQueries({ queryKey: ["hr-campus-candidates"] });
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== deleteConfirmId));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete candidate.");
    },
  });

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

  const totalCandidates = candidates.length;
  const appliedCount = candidates.filter((c: any) => c.status === "Applied").length;
  const inProgressCount = candidates.filter((c: any) => c.status === "In progress").length;
  const shortlistedCount = candidates.filter((c: any) => c.status === "Shortlisted").length;
  const selectedCount = candidates.filter((c: any) => c.status === "Selected").length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Campus Hiring & Placement Drives"
        description="Manage university recruitment campaigns, graduate student applications, technical evaluations, and campus offers."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-download-simple text-sm" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 h-8 font-semibold text-xs"
            >
              <i className="ph ph-plus text-sm" />
              <span>Add Candidate</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Applicants</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-graduation-cap text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{totalCandidates} Students</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled across college drives</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-buildings text-xs" />
              <span>All Universities</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">In Evaluation</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-hourglass-high text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{inProgressCount} In Progress</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Undergoing technical & aptitude rounds</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-clock text-xs" />
              <span>Active Rounds</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Shortlisted</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-star text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{shortlistedCount} Finalists</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cleared screening & GDs</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-check-square-offset text-xs" />
              <span>Final Interview Pool</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Offers Extended</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{selectedCount} Selected</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Campus placement offers sent</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-seal-check text-xs" />
              <span>Hired Graduates</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full xl:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search candidate, college or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="All Roles" />
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="In progress">In progress</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="Selected">Selected</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="asc">Name (A-Z)</SelectItem>
              <SelectItem value="desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Candidates Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-center p-3">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Student Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">College / University</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Branch & Year</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Job Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Recruiter</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    Loading campus candidates...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground italic">
                    No campus candidates found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((candidate: any) => (
                  <TableRow key={candidate.id} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="text-center p-3">
                      <input
                        type="checkbox"
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        checked={selectedIds.includes(candidate.id)}
                        onChange={() => toggleSelectOne(candidate.id)}
                      />
                    </TableCell>

                    <TableCell className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 border border-border/60">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {getInitials(candidate.studentName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">{candidate.studentName}</span>
                          <span className="text-[10px] text-muted-foreground">{candidate.email || candidate.phone || "—"}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="p-3 font-semibold text-foreground">
                      {candidate.collegeName || "—"}
                    </TableCell>

                    <TableCell className="p-3 text-muted-foreground font-mono">
                      {candidate.branch} ({candidate.graduationYear})
                    </TableCell>

                    <TableCell className="p-3 font-semibold text-primary">
                      {candidate.jobRole}
                    </TableCell>

                    <TableCell className="p-3 text-muted-foreground">
                      {candidate.recruiterName || "Assigned Recruiter"}
                    </TableCell>

                    <TableCell className="p-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold capitalize",
                          candidate.status === "Selected" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                          candidate.status === "Shortlisted" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                          candidate.status === "In progress" && "bg-sky-500/10 text-sky-600 border-sky-500/30",
                          candidate.status === "Applied" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                          candidate.status === "Rejected" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        )}
                      >
                        {candidate.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setEditCandidate(candidate)}
                          className="gap-1 font-semibold text-xs"
                        >
                          <i className="ph ph-pencil-simple text-xs" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => setDeleteConfirmId(candidate.id)}
                          className="gap-1 font-semibold text-xs"
                        >
                          <i className="ph ph-trash text-xs" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Add Candidate ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-graduation-cap text-primary text-lg" />
              <span>Enroll Campus Candidate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add student details from university placement drives and assign a hiring role.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.studentName.trim()) {
                toast.error("Student name is required.");
                return;
              }
              createMutation.mutate(form);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Student Name <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={form.studentName}
                  onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="student@college.edu"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">College / University</Label>
                <Input
                  placeholder="e.g. IIT Bombay / Anna University"
                  value={form.collegeName}
                  onChange={(e) => setForm((p) => ({ ...p, collegeName: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch / Specialization</Label>
                <Input
                  placeholder="e.g. B.E / B.Tech CSE"
                  value={form.branch}
                  onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Graduation Year</Label>
                <Input
                  placeholder="2025"
                  value={form.graduationYear}
                  onChange={(e) => setForm((p) => ({ ...p, graduationYear: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Job Role</Label>
                <Select
                  value={form.jobRole}
                  onValueChange={(val) => setForm((p) => ({ ...p, jobRole: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="App Developer">App Developer</SelectItem>
                    <SelectItem value="Web Developer">Web Developer</SelectItem>
                    <SelectItem value="Accountant">Accountant</SelectItem>
                    <SelectItem value="Technician">Technician</SelectItem>
                    <SelectItem value="Sales Executive">Sales Executive</SelectItem>
                    <SelectItem value="Business Analyst">Business Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Applied">Applied</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="Selected">Selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createMutation.isPending}
                className="font-bold"
              >
                Enroll Candidate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Candidate ── */}
      <Dialog open={!!editCandidate} onOpenChange={(open) => !open && setEditCandidate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-pencil-simple text-primary text-lg" />
              <span>Update Candidate Record</span>
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
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Stage</Label>
                <Select
                  value={editCandidate.status}
                  onValueChange={(val) => setEditCandidate((p: any) => ({ ...p, status: val }))}
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Job Role</Label>
                <Input
                  value={editCandidate.jobRole}
                  onChange={(e) => setEditCandidate((p: any) => ({ ...p, jobRole: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Recruiter</Label>
                <Input
                  value={editCandidate.recruiterName || ""}
                  onChange={(e) => setEditCandidate((p: any) => ({ ...p, recruiterName: e.target.value }))}
                  className="h-9 text-xs"
                  placeholder="Recruiter name"
                />
              </div>

              <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditCandidate(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="font-bold"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Delete Confirmation ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg" />
              <span>Remove Candidate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this student candidate from the placement drive?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="font-bold"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
