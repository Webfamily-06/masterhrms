import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/hr/lifecycle/complaints")({
  component: HrComplaintsPage,
});

const complaintExportColumns: ExportColumn[] = [
  { header: "Case Ticket", key: "ticketCode" },
  { header: "Category", key: "category" },
  { header: "Severity", key: "severity" },
  { header: "Subject", key: "subject" },
  { header: "Complainant", key: "complainant" },
  { header: "Status", key: "status" },
  {
    header: "Created At",
    key: "createdAt",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
];

export default function HrComplaintsPage() {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [resolutionData, setResolutionData] = useState({
    resolutionNotes: "",
    actionTaken: "counselling",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-complaints"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/complaints");
      return unwrapArray(res);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/hr/lifecycle/complaints/${id}/resolve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint case resolved.");
      setSelectedComplaint(null);
      setResolutionData({ resolutionNotes: "", actionTaken: "counselling" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to resolve complaint.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "complaints",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success(data?.message || "Selected complaints deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected complaints.");
    },
  });

  const filteredComplaints = (complaints || []).filter((c: any) => {
    const ticket = (c.ticketCode || "").toLowerCase();
    const category = (c.category || "").toLowerCase();
    const subject = (c.subject || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || ticket.includes(query) || category.includes(query) || subject.includes(query);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedComplaints = filteredComplaints.slice((page - 1) * pageSize, page * pageSize);

  const visibleComplaintIds = useMemo(() => paginatedComplaints.map((x: any) => x.id), [paginatedComplaints]);

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedComplaints);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredComplaints.filter((c: any) => selectedIds.has(c.id))
      : filteredComplaints;

    return source.map((c: any) => ({
      ticketCode: c.ticketCode,
      category: c.category,
      severity: c.severity,
      subject: c.subject,
      complainant: c.isAnonymous ? "Anonymous" : "Confidential Employee",
      status: (c.status || "").replace("_", " "),
      createdAt: c.createdAt,
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Grievances & Confidential Cases",
      columns: complaintExportColumns,
      data: getExportData(),
      filename: `complaints-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Complaints",
    });
    toast.success(`Exported ${getExportData().length} complaints to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Grievances & Confidential Cases",
      columns: complaintExportColumns,
      data: getExportData(),
      filename: `complaints-export-${format(new Date(), "yyyyMMdd")}`,
    });
    toast.success(`Exported ${getExportData().length} complaints to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grievances & Confidential Cases"
        description="Handle employee grievances, ethics reports, and workplace investigations with whistleblower confidentiality."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by ticket, category or subject..."
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
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
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
                  checked={isAllVisibleSelected(visibleComplaintIds) ? true : isSomeVisibleSelected(visibleComplaintIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleComplaintIds)}
                  aria-label="Select all visible grievances"
                />
              </TableHead>
              <TableHead>Case Ticket</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Complainant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading cases...
                </TableCell>
              </TableRow>
            ) : filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== "all"
                    ? "No grievances match your search criteria."
                    : "No active grievances on record."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedComplaints.map((c: any) => {
                const checked = isSelected(c.id);
                return (
                  <TableRow
                    key={c.id}
                    data-state={checked ? "selected" : undefined}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleRow(c.id)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRow(c.id)}
                        aria-label={`Select grievance ${c.ticketCode}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{c.ticketCode}</TableCell>
                    <TableCell>{c.category}</TableCell>
                    <TableCell>
                      <Badge variant={c.severity === "critical" ? "destructive" : "secondary"} className="capitalize">
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.subject}</TableCell>
                    <TableCell>
                      {c.isAnonymous ? (
                        <Badge variant="outline" className="text-xs">
                          Anonymous
                        </Badge>
                      ) : (
                        "Confidential Employee"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {c.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setResolutionData({
                              resolutionNotes: c.resolutionNotes || "",
                              actionTaken: c.actionTaken || "counselling",
                            });
                          }}
                        >
                          Resolve
                        </Button>
                      )}
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
          total={filteredComplaints.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conclude & Resolve Grievance</DialogTitle>
            <DialogDescription>
              Record findings and formal corrective action taken to close this case.
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Case:</strong> {selectedComplaint.ticketCode} ({selectedComplaint.category})
                </p>
                <p>
                  <strong>Description:</strong> {selectedComplaint.description}
                </p>
              </div>

              <div>
                <Label>Action Taken *</Label>
                <Select
                  value={resolutionData.actionTaken}
                  onValueChange={(val) => setResolutionData({ ...resolutionData, actionTaken: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counselling">Counselling & Mediation</SelectItem>
                    <SelectItem value="warning_issued">Disciplinary Warning Issued</SelectItem>
                    <SelectItem value="transfer">Inter-Department Transfer</SelectItem>
                    <SelectItem value="termination">Employment Termination</SelectItem>
                    <SelectItem value="no_fault">Dismissed / No Fault Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resolution Findings & Notes *</Label>
                <Textarea
                  placeholder="Summarize investigation conclusions and final remedial measures..."
                  value={resolutionData.resolutionNotes}
                  onChange={(e) => setResolutionData({ ...resolutionData, resolutionNotes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                resolveMutation.mutate({
                  id: selectedComplaint.id,
                  payload: resolutionData,
                })
              }
              disabled={!resolutionData.resolutionNotes || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Resolving..." : "Confirm & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
