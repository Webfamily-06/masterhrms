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
import { Plus, Trash2 } from "lucide-react";

const warningExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  {
    header: "Incident Date",
    key: "warningDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Severity", key: "severity" },
  { header: "Subject", key: "subject" },
  { header: "Status", key: "status" },
  { header: "Employee Response", key: "explanation" },
];

export default function HrWarningsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    employeeId: "",
    subject: "",
    severity: "moderate",
    warningDate: new Date().toISOString().split("T")[0],
    description: "",
    warningBy: "",
  });

    const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-warnings"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/warnings");
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
      return await api.post("/hr/lifecycle/warnings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Disciplinary warning issued and logged to employee timeline.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        subject: "",
        severity: "moderate",
        warningDate: new Date().toISOString().split("T")[0],
        description: "",
        warningBy: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to issue warning.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/lifecycle/warnings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning record retracted.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to retract warning.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "warnings",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success(data?.message || "Selected warning records deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected warnings.");
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-500 hover:bg-red-600">Critical</Badge>;
      case "major":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Major</Badge>;
      case "moderate":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Moderate</Badge>;
      default:
        return <Badge variant="secondary">Minor</Badge>;
    }
  };

  const filteredWarnings = (warnings || []).filter((w: any) => {
    const name = `${w.employee?.firstName || ""} ${w.employee?.lastName || ""}`.toLowerCase();
    const code = (w.employee?.employeeCode || "").toLowerCase();
    const subject = (w.subject || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || code.includes(query) || subject.includes(query);
    const matchesSeverity = severityFilter === "all" || w.severity?.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const paginatedWarnings = filteredWarnings.slice((page - 1) * pageSize, page * pageSize);

  const visibleWarningIds = useMemo(() => paginatedWarnings.map((x: any) => x.id), [paginatedWarnings]);

    const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedWarnings);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredWarnings.filter((w: any) => selectedIds.has(w.id))
      : filteredWarnings;

    return source.map((w: any) => ({
      employeeName: `${w.employee?.firstName || ""} ${w.employee?.lastName || ""}`.trim(),
      employeeCode: w.employee?.employeeCode || "—",
      warningDate: w.warningDate,
      severity: w.severity,
      subject: w.subject,
      status: w.status,
      explanation: w.employeeExplanation || "Awaiting acknowledgement",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Disciplinary Warnings & Compliance",
      columns: warningExportColumns,
      data: getExportData(),
      filename: `warnings-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Warnings",
    });
    toast.success(`Exported ${getExportData().length} warning records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Disciplinary Warnings & Compliance",
      columns: warningExportColumns,
      data: getExportData(),
      filename: `warnings-export-${format(new Date(), "yyyyMMdd")}`,
          });
    toast.success(`Exported ${getExportData().length} warning records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinary Warnings & Compliance"
        description="Issue formal reprimands, track employee digital acknowledgements, and manage written appeals."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee, code, or subject..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterSlot={
          <Select
            value={severityFilter}
            onValueChange={(val) => {
              setSeverityFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        }
        primaryActionLabel="Issue Warning"
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
                  checked={isAllVisibleSelected(visibleWarningIds) ? true : isSomeVisibleSelected(visibleWarningIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleWarningIds)}
                  aria-label="Select all visible warnings"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Incident Date</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employee Response</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading warnings...
                </TableCell>
              </TableRow>
            ) : filteredWarnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search || severityFilter !== "all"
                    ? "No warnings match your filter criteria."
                    : "No active disciplinary warnings on record."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedWarnings.map((w: any) => {
                const checked = isSelected(w.id);
                return (
                  <TableRow
                    key={w.id}
                    data-state={checked ? "selected" : undefined}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(w.id)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRow(w.id)}
                        aria-label={`Select warning for ${w.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {w.employee?.firstName} {w.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{w.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(w.warningDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getSeverityBadge(w.severity)}</TableCell>
                    <TableCell className="font-medium">{w.subject}</TableCell>
                    <TableCell>
                      <Badge variant={w.status === "acknowledged" ? "secondary" : "outline"} className="capitalize">
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {w.employeeExplanation || "Awaiting acknowledgement"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(w.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          total={filteredWarnings.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Issue Warning Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Disciplinary Warning</DialogTitle>
            <DialogDescription>
              Logs a formal reprimand to the employee's file. The employee is required to acknowledge receipt.
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
              <Label>Severity Tier *</Label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (Notice)</SelectItem>
                  <SelectItem value="moderate">Moderate (Formal Warning)</SelectItem>
                  <SelectItem value="major">Major (Written Reprimand)</SelectItem>
                  <SelectItem value="critical">Critical (Final Notice)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident Date *</Label>
              <Input
                type="date"
                value={formData.warningDate}
                onChange={(e) => setFormData({ ...formData, warningDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Subject / Violation *</Label>
              <Input
                placeholder="e.g. Unexcused absence / Breach of policy"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Issued By (Title/Authority)</Label>
              <Input
                placeholder="e.g. Department Head / HR Director"
                value={formData.warningBy}
                onChange={(e) => setFormData({ ...formData, warningBy: e.target.value })}
              />
            </div>
            <div>
              <Label>Incident Description & Findings *</Label>
              <Textarea
                placeholder="Factual findings, witnesses, and corrective action required..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.subject || !formData.description || createMutation.isPending}
            >
              {createMutation.isPending ? "Issuing..." : "Confirm & Issue Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
