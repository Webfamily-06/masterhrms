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
import { Plus, CheckCircle2 } from "lucide-react";

const transferExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  {
    header: "Effective Date",
    key: "effectiveDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Status", key: "status" },
  { header: "Target Branch", key: "targetBranch" },
  { header: "Target Dept", key: "targetDept" },
  { header: "New Manager", key: "newManager" },
  { header: "Reason", key: "reason" },
];

export default function HrTransfersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    employeeId: "",
    toBranchId: "",
    toDeptId: "",
    newManagerId: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-transfers"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/transfers");
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

  const { data: branches = [] } = useQuery({
    queryKey: ["hr-branches-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches");
      return unwrapArray(res);
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments");
      return unwrapArray(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/lifecycle/transfers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success("Employee transfer successfully executed.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        toBranchId: "",
        toDeptId: "",
        newManagerId: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute transfer.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "transfers",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-transfers"] });
      toast.success(data?.message || "Selected transfer records deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected transfers.");
    },
  });

  const filteredTransfers = (transfers || []).filter((t: any) => {
    const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
    const code = (t.employee?.employeeCode || "").toLowerCase();
    const reason = (t.reason || "").toLowerCase();
    const query = search.toLowerCase().trim();
    return !query || name.includes(query) || code.includes(query) || reason.includes(query);
  });

  const paginatedTransfers = filteredTransfers.slice((page - 1) * pageSize, page * pageSize);

  const visibleTransferIds = useMemo(() => paginatedTransfers.map((x: any) => x.id), [paginatedTransfers]);

    const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedTransfers);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredTransfers.filter((t: any) => selectedIds.has(t.id))
      : filteredTransfers;

    return source.map((t: any) => ({
      employeeName: `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim(),
      employeeCode: t.employee?.employeeCode || "—",
      effectiveDate: t.effectiveDate,
      status: t.status,
      targetBranch: t.toBranchId || "Lateral",
      targetDept: t.toDeptId || "Same Dept",
      newManager: t.newManagerId || "Same Manager",
      reason: t.reason || "—",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Employee Transfers & Mobility",
      columns: transferExportColumns,
      data: getExportData(),
      filename: `transfers-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Transfers",
    });
    toast.success(`Exported ${getExportData().length} transfer records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Employee Transfers & Relocations",
      columns: transferExportColumns,
      data: getExportData(),
      filename: `transfers-export-${format(new Date(), "yyyyMMdd")}`,
          });
    toast.success(`Exported ${getExportData().length} transfer records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Transfers & Relocations"
        description="Oversee branch transfers, inter-department movements, and reporting manager reassignments with regional policy realignment."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee, code, or details..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        primaryActionLabel="Execute Transfer"
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
                  checked={isAllVisibleSelected(visibleTransferIds) ? true : isSomeVisibleSelected(visibleTransferIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleTransferIds)}
                  aria-label="Select all visible transfers"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transfer Details</TableHead>
              <TableHead>Reason / Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading transfers...
                </TableCell>
              </TableRow>
            ) : filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? "No transfers match your search query." : "No employee transfers recorded."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransfers.map((t: any) => {
                const checked = isSelected(t.id);
                return (
                  <TableRow
                    key={t.id}
                    data-state={checked ? "selected" : undefined}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(t.id)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRow(t.id)}
                        aria-label={`Select transfer for ${t.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(t.effectiveDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.toBranchId && <span className="block">Target Branch: {t.toBranchId}</span>}
                      {t.toDeptId && <span className="block">Target Dept: {t.toDeptId}</span>}
                      {t.newManagerId && <span className="block">New Manager: {t.newManagerId}</span>}
                      {!t.toBranchId && !t.toDeptId && !t.newManagerId && "Lateral realignment"}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {t.reason || "—"}
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
          total={filteredTransfers.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Execute Transfer Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Employee Transfer</DialogTitle>
            <DialogDescription>
              Relocate employee to another branch, department, or manager. Applies regional rules on effective date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({ ...formData, employeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
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
            <div>
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Target Branch (Optional)</Label>
              <Select value={formData.toBranchId} onValueChange={(val) => setFormData({ ...formData, toBranchId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city || "HQ"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Department (Optional)</Label>
              <Select value={formData.toDeptId} onValueChange={(val) => setFormData({ ...formData, toDeptId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Reporting Manager (Optional)</Label>
              <Select value={formData.newManagerId} onValueChange={(val) => setFormData({ ...formData, newManagerId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current manager" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transfer Reason *</Label>
              <Textarea
                placeholder="Business requirement, relocation request, or organizational alignment..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.reason || createMutation.isPending}
            >
              {createMutation.isPending ? "Executing..." : "Execute Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
