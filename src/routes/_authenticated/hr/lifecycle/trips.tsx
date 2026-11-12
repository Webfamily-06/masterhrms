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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";
import { useGlobalListSelection } from "@/hooks/useGlobalListSelection";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/trips")({
  component: HrTripsPage,
});

const tripExportColumns: ExportColumn[] = [
  { header: "Employee Name", key: "employeeName" },
  { header: "Employee Code", key: "employeeCode" },
  { header: "Destination", key: "destination" },
  {
    header: "Start Date",
    key: "fromDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  {
    header: "End Date",
    key: "toDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Purpose", key: "purpose" },
  {
    header: "Advance Amount",
    key: "advanceAmount",
    format: (val: any) => (Number(val) > 0 ? `₹${Number(val).toLocaleString()}` : "0"),
  },
  { header: "Status", key: "status" },
];

export default function HrTripsPage() {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-trips"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/trips");
      return unwrapArray(res);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
      return await api.put(`/hr/lifecycle/trips/${id}/approve`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Business trip approved.");
      setSelectedTrip(null);
      setApprovalRemarks("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to approve trip.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/hr/lifecycle/bulk-delete", {
        entity: "trips",
        ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success(data?.message || "Selected travel requests deleted.");
      clearSelection();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete selected travel requests.");
    },
  });

  const filteredTrips = (trips || []).filter((t: any) => {
    const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
    const dest = (t.destination || "").toLowerCase();
    const purpose = (t.purpose || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || dest.includes(query) || purpose.includes(query);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize);

  const visibleTripIds = useMemo(() => paginatedTrips.map((x: any) => x.id), [paginatedTrips]);

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedTrips);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredTrips.filter((t: any) => selectedIds.has(t.id))
      : filteredTrips;

    return source.map((t: any) => ({
      employeeName: `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.trim(),
      employeeCode: t.employee?.employeeCode || "—",
      destination: t.destination,
      fromDate: t.fromDate,
      toDate: t.toDate,
      purpose: t.purpose || "—",
      advanceAmount: t.advanceAmount,
      status: t.status,
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Business Travel & Expense Authorizations",
      columns: tripExportColumns,
      data: getExportData(),
      filename: `business-trips-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Trips",
    });
    toast.success(`Exported ${getExportData().length} travel records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Business Travel & Expense Authorizations",
      columns: tripExportColumns,
      data: getExportData(),
      filename: `business-trips-export-${format(new Date(), "yyyyMMdd")}`,
    });
    toast.success(`Exported ${getExportData().length} travel records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Travel & Expense Authorizations"
        description="Review official travel requests, approve cash advances, and verify return expense settlements."
      />

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by employee, destination, or purpose..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
                  checked={isAllVisibleSelected(visibleTripIds) ? true : isSomeVisibleSelected(visibleTripIds) ? "indeterminate" : false}
                  onCheckedChange={() => selectAllVisible(visibleTripIds)}
                  aria-label="Select all visible travel requests"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Advance Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading travel requests...
                </TableCell>
              </TableRow>
            ) : filteredTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== "all"
                    ? "No travel requests match your filter criteria."
                    : "No business travel requests on record."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrips.map((t: any) => {
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
                        aria-label={`Select travel request for ${t.employee?.firstName || "employee"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.position || "Staff"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {t.destination}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(t.fromDate).toLocaleDateString()} – {new Date(t.toDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{t.purpose}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(t.advanceAmount) > 0 ? `₹${Number(t.advanceAmount).toLocaleString()}` : "No advance"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "approved" ? "default" : "secondary"} className="capitalize">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {t.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTrip(t)}
                        >
                          Approve
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
          total={filteredTrips.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Business Trip</DialogTitle>
            <DialogDescription>Authorize travel dates and advance disbursement.</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Employee:</strong> {selectedTrip.employee?.firstName} {selectedTrip.employee?.lastName}
                </p>
                <p>
                  <strong>Destination:</strong> {selectedTrip.destination} ({selectedTrip.travelMode})
                </p>
                <p>
                  <strong>Advance:</strong> ₹{Number(selectedTrip.advanceAmount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Approval Remarks</Label>
                <Input
                  placeholder="e.g. Approved as per client meeting schedule"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTrip(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                approveMutation.mutate({
                  id: selectedTrip.id,
                  remarks: approvalRemarks,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
