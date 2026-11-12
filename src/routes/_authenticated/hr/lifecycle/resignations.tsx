import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
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

export const Route = createFileRoute("/_authenticated/hr/lifecycle/resignations")({
  component: HrResignationsPage,
});

const resignationExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  { header: "Designation", key: "position" },
  {
    header: "Notice Date",
    key: "resignationDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  {
    header: "Last Working Day",
    key: "lastWorkingDay",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Notice Duration (Days)", key: "noticePeriodDays" },
  { header: "Status", key: "status", format: (val: any) => (val ? String(val).replace("_", " ") : "") },
  { header: "Reason", key: "reason" },
];

export default function HrResignationsPage() {
  const queryClient = useQueryClient();
  const [selectedExit, setSelectedExit] = useState<any>(null);
  const [reviewData, setReviewData] = useState({
    status: "clearance_pending",
    acceptedLastWorkingDay: "",
    notes: "",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-resignations"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/resignations");
      return res.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/hr/lifecycle/resignations/${id}/review`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation review recorded.");
      setSelectedExit(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update resignation.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "resignations",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success(data?.message || "Selected resignation records deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected resignations.");
    },
  });

  const filteredResignations = (resignations || []).filter((r: any) => {
    const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const reason = (r.reason || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || reason.includes(query);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedResignations = filteredResignations.slice((page - 1) * pageSize, page * pageSize);

  const visibleResignationIds = useMemo(() => paginatedResignations.map((x: any) => x.id), [paginatedResignations]);

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedResignations);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredResignations.filter((r: any) => selectedIds.has(r.id))
      : filteredResignations;

    return source.map((r: any) => ({
      employeeName: `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim(),
      employeeCode: r.employee?.employeeCode || "—",
      position: r.employee?.position || "Staff",
      resignationDate: r.resignationDate,
      lastWorkingDay: r.lastWorkingDay,
      noticePeriodDays: r.noticePeriodDays,
      status: r.status,
      reason: r.reason || "—",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Employee Resignations & Voluntary Departures",
      columns: resignationExportColumns,
      data: getExportData(),
      filename: `resignations-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Resignations",
    });
    toast.success(`Exported ${getExportData().length} resignation records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Employee Resignations & Notice Periods",
      columns: resignationExportColumns,
      data: getExportData(),
      filename: `resignations-export-${format(new Date(), "yyyyMMdd")}`,
    });
    toast.success(`Exported ${getExportData().length} resignation records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resignations & Notice Periods"
        description="Review incoming employee resignations, manage notice periods, calculate policy last working days, and schedule exit clearances."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee or reason..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterSlot={
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="notice_active">Notice Active</SelectItem>
              <SelectItem value="clearance_pending">Clearance Pending</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="relieved">Relieved</SelectItem>
            </SelectContent>
          </Select>
        }
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
                  checked={isAllVisibleSelected(visibleResignationIds) ? true : isSomeVisibleSelected(visibleResignationIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleResignationIds)}
                  aria-label="Select all visible resignations"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Notice Date</TableHead>
              <TableHead>Last Working Day</TableHead>
              <TableHead>Notice Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading resignations...
                </TableCell>
              </TableRow>
            ) : filteredResignations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== "all"
                    ? "No resignation records match your filter criteria."
                    : "No active resignation notices on record."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedResignations.map((r: any) => {
                const checked = isSelected(r.id);
                return (
                  <TableRow
                    key={r.id}
                    data-state={checked ? "selected" : undefined}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(r.id)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRow(r.id)}
                        aria-label={`Select resignation for ${r.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.employee?.firstName} {r.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{r.employee?.position || "Staff"}</span>
                    </TableCell>
                    <TableCell>{new Date(r.resignationDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">
                      {new Date(r.lastWorkingDay).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{r.noticePeriodDays} days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedExit(r);
                          setReviewData({
                            status: r.status,
                            acceptedLastWorkingDay: new Date(r.lastWorkingDay).toISOString().split("T")[0],
                            notes: r.exitInterviewNotes || "",
                          });
                        }}
                      >
                        Review
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
          total={filteredResignations.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Review Resignation Dialog */}
      <Dialog open={!!selectedExit} onOpenChange={(open) => !open && setSelectedExit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Resignation</DialogTitle>
            <DialogDescription>
              Accept notice, calibrate the last working day, or initiate the exit clearance checklist.
            </DialogDescription>
          </DialogHeader>
          {selectedExit && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Employee:</strong> {selectedExit.employee?.firstName} {selectedExit.employee?.lastName}
                </p>
                <p>
                  <strong>Stated Reason:</strong> {selectedExit.reason}
                </p>
                <p>
                  <strong>Notice Start:</strong> {new Date(selectedExit.resignationDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <Label>Decision / Stage *</Label>
                <Select
                  value={reviewData.status}
                  onValueChange={(val) => setReviewData({ ...reviewData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serving_notice">Serving Notice Period</SelectItem>
                    <SelectItem value="clearance_pending">Accept & Initiate Clearance</SelectItem>
                    <SelectItem value="withdrawn">Mark As Retained / Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Approved Last Working Day (LWD)</Label>
                <Input
                  type="date"
                  value={reviewData.acceptedLastWorkingDay}
                  onChange={(e) => setReviewData({ ...reviewData, acceptedLastWorkingDay: e.target.value })}
                />
              </div>

              <div>
                <Label>Exit Interview & Retention Notes</Label>
                <Textarea
                  placeholder="Record retention discussions, handover timeline, or interview comments..."
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExit(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                reviewMutation.mutate({
                  id: selectedExit.id,
                  payload: reviewData,
                })
              }
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "Updating..." : "Save Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
