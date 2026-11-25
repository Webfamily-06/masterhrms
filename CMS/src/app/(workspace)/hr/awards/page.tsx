'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  LifecycleDocumentField,
  DocumentPreviewBlock,
} from "@/components/hr/lifecycle-document-field";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Gift,
  Award,
  ArrowUpDown,
  FileText,
  X,
} from "lucide-react";

function formatDateSafe(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return String(val).slice(0, 10);
  }
}

function toInputDate(val?: string | null) {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

const emptyForm = {
  employeeId: "",
  awardTypeId: "",
  awardDate: new Date().toISOString().split("T")[0],
  giftItem: "",
  description: "",
  certificateUrl: "",
  certificateName: "",
};

export default function HrAwardsPage() {
  const queryClient = useQueryClient();

  // Filter & Sort State
  const [search, setSearch] = useState("");
  const [awardTypeFilter, setAwardTypeFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: awards = [], isLoading } = useQuery({
    queryKey: ["hr-awards"],
    queryFn: async () => {
      const res = await api.get("/api/hr/awards?limit=500");
      return unwrapArray(res);
    },
  });

  const { data: awardTypes = [] } = useQuery({
    queryKey: ["award-types"],
    queryFn: async () => {
      const res = await api.get("/api/hr/organization/award-types?limit=100");
      return unwrapArray(res);
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/api/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const activeAwardTypes = useMemo(
    () => awardTypes.filter((t: any) => t.status !== "inactive"),
    [awardTypes]
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post("/api/hr/awards", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
      toast.success("Award created successfully.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create award.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/api/hr/awards/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
      toast.success("Award updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update award.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/hr/awards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
      toast.success("Award deleted successfully.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete award.");
    },
  });

  // Filtering & Sorting
  const filteredAwards = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...awards]
      .filter((a: any) => {
        const name = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.toLowerCase();
        const email = (a.employee?.email || "").toLowerCase();
        const typeName = (a.awardType?.name || "").toLowerCase();
        const gift = (a.giftItem || "").toLowerCase();
        const desc = (a.description || "").toLowerCase();
        if (q && !name.includes(q) && !email.includes(q) && !typeName.includes(q) && !gift.includes(q) && !desc.includes(q)) {
          return false;
        }
        if (awardTypeFilter !== "all" && a.awardTypeId !== awardTypeFilter) return false;
        if (employeeFilter !== "all" && a.employeeId !== employeeFilter) return false;

        const d = a.awardDate ? new Date(a.awardDate) : null;
        if (dateFrom && d && d < new Date(dateFrom)) return false;
        if (dateTo && d) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a.awardDate || 0).getTime();
        const bVal = new Date(b.awardDate || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [awards, search, awardTypeFilter, employeeFilter, dateFrom, dateTo, sortDir]);

  const paginatedAwards = filteredAwards.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (award: any) => {
    setEditingItem(award);
    setFormData({
      employeeId: award.employeeId || "",
      awardTypeId: award.awardTypeId || "",
      awardDate: toInputDate(award.awardDate),
      giftItem: award.giftItem || "",
      description: award.description || "",
      certificateUrl: award.certificateUrl || "",
      certificateName: award.certificateUrl
        ? award.certificateUrl.split("/").pop()?.split("?")[0] || ""
        : "",
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!formData.awardTypeId) {
      toast.error("Please select an award type.");
      return;
    }
    if (!formData.awardDate) {
      toast.error("Award date is required.");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    const payload = {
      employeeId: formData.employeeId,
      awardTypeId: formData.awardTypeId,
      awardDate: formData.awardDate,
      giftItem: formData.giftItem.trim() || null,
      description: formData.description.trim(),
      certificateUrl: formData.certificateUrl || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const hasActiveFilters = Boolean(
    search || awardTypeFilter !== "all" || employeeFilter !== "all" || dateFrom || dateTo
  );

  const clearFilters = () => {
    setSearch("");
    setAwardTypeFilter("all");
    setEmployeeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Awards"
        description="Manage awards and recognitions given to employees."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Awards" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Add Award
          </Button>
        }
      />

      {/* Filter Bar Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={awardTypeFilter}
            onValueChange={(val) => {
              setAwardTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[175px] h-9">
              <SelectValue placeholder="All Award Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Award Types</SelectItem>
              {awardTypes.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={employeeFilter}
            onValueChange={(val) => {
              setEmployeeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[175px] h-9">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date From"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date To"
          />

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-[11px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Award Type</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span className="inline-flex items-center gap-1">
                    Award Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Gift</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Loading awards...
                  </TableCell>
                </TableRow>
              ) : paginatedAwards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No awards found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAwards.map((award: any, idx: number) => {
                  const fullName = `${award.employee?.firstName || ""} ${award.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const matchedEmp = employees.find((e: any) => e.id === award.employeeId);
                  const avatarUrl =
                    award.employee?.avatarUrl ||
                    award.employee?.user?.profile?.avatarUrl ||
                    matchedEmp?.avatarUrl ||
                    matchedEmp?.user?.profile?.avatarUrl ||
                    "";

                  return (
                    <TableRow key={award.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-muted-foreground">
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/60">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {award.employee?.email || award.employee?.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
                          {award.awardType?.name || "Recognition Award"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(award.awardDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {award.giftItem ? (
                          <Badge className="bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20 font-medium gap-1.5">
                            <Gift className="h-3 w-3" />
                            {award.giftItem}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View Award"
                            onClick={() => setViewItem(award)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit Award"
                            onClick={() => handleOpenEdit(award)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Award"
                            onClick={() => setDeleteTarget(award)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={filteredAwards.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Award Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Award" : "Add Award"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Award Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.awardTypeId}
                onValueChange={(val) => setFormData({ ...formData, awardTypeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select award type" />
                </SelectTrigger>
                <SelectContent>
                  {(editingItem ? awardTypes : activeAwardTypes).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Award Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.awardDate}
                onChange={(e) => setFormData({ ...formData, awardDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Gift</Label>
              <Input
                placeholder="e.g. Extra Leave Days, Dinner Voucher, Trophy, Watch"
                value={formData.giftItem}
                onChange={(e) => setFormData({ ...formData, giftItem: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Describe the employee's achievement and contribution..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Certificate"
              folder="tenant/awards"
              documentUrl={formData.certificateUrl}
              documentName={formData.certificateName}
              onChange={(url, name) =>
                setFormData({ ...formData, certificateUrl: url, certificateName: name })
              }
              placeholder="Select certificate file..."
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Award className="h-4 w-4" />
              </span>
              Award Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {(viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl) && (
                      <AvatarImage
                        src={viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {`${viewItem.employee?.firstName?.[0] || ""}${viewItem.employee?.lastName?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Employee</p>
                    <p className="font-semibold text-sm text-foreground">
                      {viewItem.employee?.firstName} {viewItem.employee?.lastName}
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-500/10 text-blue-700 border border-blue-500/20">
                  {viewItem.awardType?.name || "Award"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Award Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.awardDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Gift className="h-3.5 w-3.5" />
                    <span>Gift</span>
                  </div>
                  <div>
                    {viewItem.giftItem ? (
                      <Badge className="bg-pink-500/10 text-pink-700 border border-pink-500/20 gap-1">
                        <Gift className="h-3 w-3" />
                        {viewItem.giftItem}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              <DocumentPreviewBlock
                url={viewItem.certificateUrl}
                label="Certificate"
              />

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {viewItem.description || "No description provided."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Award"
        description="Are you sure you want to delete this award record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
