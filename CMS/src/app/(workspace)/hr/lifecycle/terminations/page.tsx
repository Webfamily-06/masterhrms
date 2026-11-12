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
import { Plus, AlertTriangle } from "lucide-react";

const terminationExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  {
    header: "Termination Date",
    key: "lastWorkingDay",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Category / Grounds", key: "exitType" },
  {
    header: "Severance Provision",
    key: "severance",
    format: (val: any) => (Number(val) > 0 ? `₹${Number(val).toLocaleString()}` : "None"),
  },
  { header: "Reason / Documentation", key: "reason" },
  { header: "Status", key: "status" },
];

export default function HrTerminationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    employeeId: "",
    exitType: "termination",
    severanceAmount: "0",
    reason: "",
    rehireEligible: false,
  });

  const { data: terminations = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-terminations"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/terminations");
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
      return await api.post("/hr/lifecycle/terminations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-terminations"] });
      toast.success("Termination executed and user access deactivated.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        exitType: "termination",
        severanceAmount: "0",
        reason: "",
        rehireEligible: false,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to execute termination.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "terminations",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-terminations"] });
      toast.success(data?.message || "Selected termination records deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected terminations.");
    },
  });

  const filteredTerminations = (terminations || []).filter((t: any) => {
    const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
    const code = (t.employee?.employeeCode || "").toLowerCase();
    const reason = (t.reason || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || code.includes(query) || reason.includes(query);
    const matchesType = typeFilter === "all" || t.exitType === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedTerminations = filteredTerminations.slice((page - 1) * pageSize, page * pageSize);

  const visibleTerminationIds = useMemo(() => paginatedTerminations.map((x: any) => x.id), [paginatedTerminations]);

    const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedTerminations);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredTerminations.filter((t: any) => selectedIds.has(t.id))
      : filteredTerminations;

    return source.map((t: any) => ({
      employeeName: `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim(),
      employeeCode: t.employee?.employeeCode || "—",
      lastWorkingDay: t.lastWorkingDay,
      exitType: t.exitType,
      severance: t.fnfSettlementAmount,
      reason: t.reason || "—",
      status: t.status || "terminated",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Involuntary Terminations & Departures",
      columns: terminationExportColumns,
      data: getExportData(),
      filename: `terminations-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Terminations",
    });
    toast.success(`Exported ${getExportData().length} termination records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Involuntary Terminations & Severance",
      columns: terminationExportColumns,
      data: getExportData(),
      filename: `terminations-export-${format(new Date(), "yyyyMMdd")}`,
          });
    toast.success(`Exported ${getExportData().length} termination records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Involuntary Terminations & Severance"
        description="Execute authoritative employee terminations under strict compliance with severance calculations and immediate user credential revocation."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee, code, or grounds..."
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
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="termination">Standard Termination</SelectItem>
              <SelectItem value="misconduct">Misconduct / Disciplinary</SelectItem>
              <SelectItem value="layoff">Layoff / Redundancy</SelectItem>
              <SelectItem value="performance">Performance Failure</SelectItem>
            </SelectContent>
          </Select>
        }
        primaryActionLabel="Execute Termination"
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
                  checked={isAllVisibleSelected(visibleTerminationIds) ? true : isSomeVisibleSelected(visibleTerminationIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleTerminationIds)}
                  aria-label="Select all visible terminations"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Termination Date</TableHead>
              <TableHead>Category / Grounds</TableHead>
              <TableHead>Severance</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading termination records...
                </TableCell>
              </TableRow>
            ) : filteredTerminations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || typeFilter !== "all"
                    ? "No termination records match your search criteria."
                    : "No involuntary terminations on record."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTerminations.map((t: any) => {
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
                        aria-label={`Select termination for ${t.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(t.lastWorkingDay).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="capitalize">
                        {t.exitType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(t.fnfSettlementAmount) > 0 ? `₹${Number(t.fnfSettlementAmount).toLocaleString()}` : "None"}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {t.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.status}
                      </Badge>
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
          total={filteredTerminations.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Execute Termination Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Execute Involuntary Termination
            </DialogTitle>
            <DialogDescription>
              Immediately transitions employee status to terminated, revokes application login access, and records legal severance grounds.
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
              <Label>Grounds / Category *</Label>
              <Select value={formData.exitType} onValueChange={(val) => setFormData({ ...formData, exitType: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termination">General Termination</SelectItem>
                  <SelectItem value="performance">Unsatisfactory Performance</SelectItem>
                  <SelectItem value="misconduct">Gross Misconduct / Policy Violation</SelectItem>
                  <SelectItem value="redundancy">Organizational Redundancy</SelectItem>
                  <SelectItem value="absconding">Absconding / Abandonment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severance / Gratuity Provision (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.severanceAmount}
                onChange={(e) => setFormData({ ...formData, severanceAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Formal Grounds & Legal Documentation *</Label>
              <Textarea
                placeholder="Document detailed legal justification, notice period terms, and management decision..."
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
              variant="destructive"
              onClick={() =>
                createMutation.mutate({
                  ...formData,
                  severanceAmount: parseFloat(formData.severanceAmount) || 0,
                })
              }
              disabled={!formData.employeeId || !formData.reason || createMutation.isPending}
            >
              {createMutation.isPending ? "Executing..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
