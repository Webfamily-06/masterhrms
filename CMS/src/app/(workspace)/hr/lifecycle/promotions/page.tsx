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
import { Checkbox } from "@/components/ui/checkbox";
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
import { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";
import { useGlobalListSelection } from "@/hooks/useGlobalListSelection";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { toast } from "sonner";
import { Plus, ArrowRight } from "lucide-react";

const promotionExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  {
    header: "Effective Date",
    key: "promotionDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Previous Role", key: "previousDesignation" },
  { header: "New Role", key: "newDesignation" },
  {
    header: "Previous Salary",
    key: "previousSalary",
    format: (val: any) => (val ? `₹${Number(val).toLocaleString()}` : "—"),
  },
  {
    header: "New Salary",
    key: "newSalary",
    format: (val: any) => (val ? `₹${Number(val).toLocaleString()}` : "—"),
  },
  { header: "Promotion Type", key: "promotionType" },
  { header: "Remarks", key: "remarks" },
];

export default function HrPromotionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    employeeId: "",
    newDesignation: "",
    newDepartment: "",
    newSalary: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    promotionType: "merit",
    remarks: "",
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-promotions"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/promotions");
      return unwrapArray(res);
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=200");
      return unwrapArray(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/lifecycle/promotions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success("Promotion successfully recorded and employee profile updated.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        newDesignation: "",
        newDepartment: "",
        newSalary: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        promotionType: "merit",
        remarks: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute promotion.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "promotions",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-promotions"] });
      toast.success(data?.message || "Selected promotion records deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected promotions.");
    },
  });

  const selectedEmployee = employees.find((e: any) => e.id === formData.employeeId);

  const filteredPromotions = (promotions || []).filter((p: any) => {
    const name = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.toLowerCase();
    const code = (p.employee?.employeeCode || "").toLowerCase();
    const desig = (p.newDesignation || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || code.includes(query) || desig.includes(query);
    const matchesType = typeFilter === "all" || p.promotionType === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedPromotions = filteredPromotions.slice((page - 1) * pageSize, page * pageSize);

  const visiblePromotionIds = useMemo(() => paginatedPromotions.map((x: any) => x.id), [paginatedPromotions]);

    const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedPromotions);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredPromotions.filter((p: any) => selectedIds.has(p.id))
      : filteredPromotions;

    return source.map((p: any) => ({
      employeeName: `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim(),
      employeeCode: p.employee?.employeeCode || "—",
      promotionDate: p.promotionDate,
      previousDesignation: p.previousDesignation || "—",
      newDesignation: p.newDesignation || "—",
      previousSalary: p.previousSalary,
      newSalary: p.newSalary,
      promotionType: p.promotionType,
      remarks: p.remarks || "—",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Promotions & Career Progressions",
      columns: promotionExportColumns,
      data: getExportData(),
      filename: `promotions-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Promotions",
    });
    toast.success(`Exported ${getExportData().length} promotion records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Employee Promotions & Progressions",
      columns: promotionExportColumns,
      data: getExportData(),
      filename: `promotions-export-${format(new Date(), "yyyyMMdd")}`,
          });
    toast.success(`Exported ${getExportData().length} promotion records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions & Career Progressions"
        description="Authorize merit-based promotions, role elevations, and compensation revisions with immutable audit logging."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee, code or role..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterSlot={
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="All Promotion Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="merit">Merit-Based</SelectItem>
              <SelectItem value="tenure">Tenure-Based</SelectItem>
              <SelectItem value="restructuring">Restructuring</SelectItem>
              <SelectItem value="acting">Acting Role</SelectItem>
            </SelectContent>
          </Select>
        }
        primaryActionLabel="Record Promotion"
        primaryActionIcon={<Plus className="h-4 w-4" />}
        onPrimaryAction={() => setIsModalOpen(true)}
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        isActionLoading={bulkDeleteMutation.isPending}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllVisibleSelected(visiblePromotionIds) ? true : isSomeVisibleSelected(visiblePromotionIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visiblePromotionIds)}
                  aria-label="Select all visible promotions"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Designation Movement</TableHead>
              <TableHead>Compensation Adjustment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Justification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading promotion records...
                </TableCell>
              </TableRow>
            ) : filteredPromotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || typeFilter !== "all"
                    ? "No promotion records match your filter criteria."
                    : "No promotions recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedPromotions.map((p: any) => {
                const checked = isSelected(p.id);
                return (
                  <TableRow
                    key={p.id}
                    data-state={checked ? "selected" : undefined}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(p.id)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRow(p.id)}
                        aria-label={`Select promotion for ${p.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.employee?.firstName} {p.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{p.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(p.promotionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{p.previousDesignation || "—"}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="font-semibold text-foreground">{p.newDesignation}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.newSalary ? (
                        <span>
                          {p.previousSalary ? `₹${Number(p.previousSalary).toLocaleString()} → ` : ""}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            ₹{Number(p.newSalary).toLocaleString()}
                          </strong>
                        </span>
                      ) : (
                        "No salary revision"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {p.promotionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {p.remarks || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={filteredPromotions.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Record Promotion Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Promotion</DialogTitle>
            <DialogDescription>
              Atomically upgrades the employee's title, compensation, and publishes an append-only timeline event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({ ...formData, employeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {selectedEmployee.position || "N/A"} | Current Salary: ₹{selectedEmployee.salary ? Number(selectedEmployee.salary).toLocaleString() : "0"}
                </p>
              )}
            </div>
            <div>
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
            <div>
              <Label>New Designation / Role *</Label>
              <Input
                placeholder="e.g. Senior Software Architect"
                value={formData.newDesignation}
                onChange={(e) => setFormData({ ...formData, newDesignation: e.target.value })}
              />
            </div>
            <div>
              <Label>Revised Salary (₹ / Annual or Monthly CTC)</Label>
              <Input
                type="number"
                placeholder="e.g. 1200000"
                value={formData.newSalary}
                onChange={(e) => setFormData({ ...formData, newSalary: e.target.value })}
              />
            </div>
            <div>
              <Label>Promotion Type</Label>
              <Select
                value={formData.promotionType}
                onValueChange={(val) => setFormData({ ...formData, promotionType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merit">Merit & Performance</SelectItem>
                  <SelectItem value="annual_appraisal">Annual Appraisal</SelectItem>
                  <SelectItem value="reorganization">Org Reorganization</SelectItem>
                  <SelectItem value="fast_track">Fast Track Elevation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification & Remarks</Label>
              <Textarea
                placeholder="Reasoning, committee approvals, or performance milestones..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...formData,
                  newSalary: formData.newSalary ? parseFloat(formData.newSalary) : undefined,
                })
              }
              disabled={!formData.employeeId || !formData.newDesignation || createMutation.isPending}
            >
              {createMutation.isPending ? "Recording..." : "Execute Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
