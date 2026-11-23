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

export default function HrCertificationsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

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
    data: certsData,
    isLoading,
  } = useQuery({
    queryKey: ["hr-training-certifications", search],
    queryFn: async () => {
      try {
        const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const res: any = await api.get(`/api/training/certifications${q}`);
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const certs: any[] = Array.isArray(certsData) ? certsData : [];

  // Fetch Courses
  const { data: coursesData } = useQuery({
    queryKey: ["training-courses-list-mini"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/training/courses");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const courses: any[] = Array.isArray(coursesData) ? coursesData : [];

  // Fetch Employees
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-cert-mini"],
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
  const filteredCerts = useMemo(() => {
    let result = [...certs];

    if (sortBy === "recent") {
      result.sort(
        (a, b) =>
          new Date(b.certifiedAt || b.createdAt || 0).getTime() -
          new Date(a.certifiedAt || a.createdAt || 0).getTime()
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
    }

    return result;
  }, [certs, sortBy]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post("/api/training/certifications", payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Certification issued successfully!");
      qc.invalidateQueries({ queryKey: ["hr-training-certifications"] });
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
      return await api.delete(`/api/training/certifications/${id}`);
    },
    onSuccess: () => {
      toast.success("Certification record revoked successfully.");
      qc.invalidateQueries({ queryKey: ["hr-training-certifications"] });
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmId));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to revoke certification.");
    },
  });

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

  const handleExportCSV = () => {
    if (filteredCerts.length === 0) {
      toast.error("No certification records to export.");
      return;
    }

    const headers = [
      "Certificate ID",
      "Employee Name",
      "Course / Skill",
      "Issue Date",
      "Expiry Date",
      "Score",
      "Status",
    ];

    const rows = filteredCerts.map((c) => {
      const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
      return [
        c.certificateId || "—",
        `${c.employee?.firstName || ""} ${c.employee?.lastName || ""}`.trim() || "Staff",
        c.course?.title || c.course?.name || "Skill Certification",
        c.certifiedAt ? new Date(c.certifiedAt).toISOString().slice(0, 10) : "",
        c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 10) : "",
        c.score || "100",
        isExpired ? "Expired" : "Active",
      ];
    });

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
    link.setAttribute("download", `certifications_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Certifications exported successfully!");
  };

  const totalCerts = certs.length;
  const activeCerts = certs.filter((c: any) => !c.expiryDate || new Date(c.expiryDate) >= new Date()).length;
  const expiredCerts = totalCerts - activeCerts;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Certification & Skills Tracking"
        description="Verify employee training credentials, statutory professional licenses, scorecards, and renewal timelines."
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
              <span>Issue Certificate</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Certifications</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-certificate text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{totalCerts} Issued</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Across internal & external courses</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-graduation-cap text-xs" />
              <span>All Skill Badges</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Active & Valid</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{activeCerts} Verified</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Compliant with expiry standards</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-seal-check text-xs" />
              <span>Active Compliance</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Expired / Expiring Soon</span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i className="ph ph-clock-countdown text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-amber-600">{expiredCerts} Records</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Requires renewal assessment</p>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-arrows-clockwise text-xs" />
              <span>Renewal Triggered</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search employee, certificate ID or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Certified</SelectItem>
              <SelectItem value="asc">Name (A-Z)</SelectItem>
              <SelectItem value="desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-center p-3">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    checked={filteredCerts.length > 0 && selectedIds.length === filteredCerts.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Cert ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Course / Skill</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Certified Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Valid Until</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Score</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-xs text-muted-foreground">
                    Loading certification credentials...
                  </TableCell>
                </TableRow>
              ) : filteredCerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-xs text-muted-foreground italic">
                    No certification credentials found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCerts.map((c: any) => {
                  const emp = c.employee || {};
                  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Staff Member";
                  const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="text-center p-3">
                        <input
                          type="checkbox"
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelectOne(c.id)}
                        />
                      </TableCell>

                      <TableCell className="p-3 font-mono font-bold text-muted-foreground">
                        {c.certificateId || `CERT-${c.id?.slice(0, 6) || "001"}`}
                      </TableCell>

                      <TableCell className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border border-border/60">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {getInitials(emp.firstName, emp.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">{fullName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode || "EMP"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-3 font-semibold text-foreground">
                        {c.course?.title || c.course?.name || "Professional Certification"}
                      </TableCell>

                      <TableCell className="p-3 font-mono text-muted-foreground">
                        {formatDate(c.certifiedAt)}
                      </TableCell>

                      <TableCell className="p-3 font-mono text-muted-foreground">
                        {formatDate(c.expiryDate)}
                      </TableCell>

                      <TableCell className="p-3 font-mono font-bold text-primary">
                        {c.score || "100"}%
                      </TableCell>

                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            !isExpired && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            isExpired && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          )}
                        >
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setViewCertItem(c)}
                            className="gap-1 font-semibold text-xs"
                          >
                            <i className="ph ph-eye text-xs" />
                            <span>View</span>
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(c.id)}
                            className="gap-1 font-semibold text-xs"
                          >
                            <i className="ph ph-trash text-xs" />
                            <span>Revoke</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: Issue Certificate ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="ph ph-certificate text-primary text-lg" />
              <span>Issue Skill Certification</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign an official skill certificate or course completion badge to an employee.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId || !form.courseId) {
                toast.error("Please select both an employee and a course.");
                return;
              }
              createMutation.mutate(form);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee <span className="text-rose-500">*</span></Label>
              <Select
                value={form.employeeId}
                onValueChange={(val) => setForm((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Certified Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course / Certification <span className="text-rose-500">*</span></Label>
              <Select
                value={form.courseId}
                onValueChange={(val) => setForm((p) => ({ ...p, courseId: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Training Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course: any) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title || course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Certification Date</Label>
                <Input
                  type="date"
                  value={form.certifiedAt}
                  onChange={(e) => setForm((p) => ({ ...p, certifiedAt: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Certificate ID</Label>
                <Input
                  placeholder="e.g. CERT-2026-089"
                  value={form.certificateId}
                  onChange={(e) => setForm((p) => ({ ...p, certificateId: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Score / Grade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
                  className="h-9 text-xs"
                />
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
                Issue Certificate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: View Certificate ── */}
      <Dialog open={!!viewCertItem} onOpenChange={(open) => !open && setViewCertItem(null)}>
        <DialogContent className="max-w-md text-center p-6 space-y-4">
          <div className="size-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <i className="ph ph-certificate text-3xl" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">Certificate of Completion</span>
            <h3 className="text-lg font-bold text-foreground mt-1">
              {viewCertItem?.course?.title || viewCertItem?.course?.name || "Skill Certification"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Presented proudly to{" "}
              <strong className="text-foreground">
                {viewCertItem?.employee?.firstName} {viewCertItem?.employee?.lastName}
              </strong>
            </p>
          </div>

          <div className="bg-muted/40 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certificate ID:</span>
              <span className="font-mono font-bold text-foreground">{viewCertItem?.certificateId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date:</span>
              <span className="font-mono text-foreground">{formatDate(viewCertItem?.certifiedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Through:</span>
              <span className="font-mono text-foreground">{formatDate(viewCertItem?.expiryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score Achieved:</span>
              <span className="font-mono font-bold text-primary">{viewCertItem?.score || "100"}%</span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewCertItem(null)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Revoke Confirmation ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg" />
              <span>Revoke Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to revoke this employee certification record?
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
              Confirm Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
