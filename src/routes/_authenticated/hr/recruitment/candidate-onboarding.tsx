import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";
import { useGlobalListSelection } from "@/hooks/useGlobalListSelection";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
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
import { toast } from "sonner";
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Users,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/candidate-onboarding")({
  component: HrCandidateOnboardingPage,
});

const onboardingExportColumns: ExportColumn[] = [
  { header: "Candidate Name", key: "candidateName" },
  { header: "Email", key: "email" },
  {
    header: "Expected Joining Date",
    key: "joiningDate",
    format: (val: any) => (val ? format(new Date(val), "yyyy-MM-dd") : ""),
  },
  { header: "Progress (%)", key: "progress" },
  { header: "Status", key: "status" },
];

export default function HrCandidateOnboardingPage() {
  const queryClient = useQueryClient();
  const [selectedOnboarding, setSelectedOnboarding] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Queries
  const { data: onboardingList = [], isLoading } = useQuery({
    queryKey: ["hr-candidate-onboarding"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; onboarding?: any[] }>("/hr/recruitment/candidate-onboarding");
      return Array.isArray(res) ? res : res.data || res.onboarding || [];
    },
  });

  // Task Update Mutation
  const taskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return await api.post(`/hr/recruitment/candidate-onboarding/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      toast.success("Onboarding task status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-onboarding"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  // Calculate completion percentage
  const getProgress = (tasks: any[] = []) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "verified" || t.status === "waived").length;
    return Math.round((completed / tasks.length) * 100);
  };

  const filteredOnboarding = (onboardingList || []).filter((item: any) => {
    const name = (item.candidate?.fullName || "").toLowerCase();
    const email = (item.candidate?.email || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || email.includes(query);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedOnboarding = filteredOnboarding.slice((page - 1) * pageSize, page * pageSize);

  const visibleCandidateIds = useMemo(() => paginatedOnboarding.map((o: any) => o.id), [paginatedOnboarding]);

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useGlobalListSelection(paginatedOnboarding);

  const getExportData = () => {
    const source = selectedCount > 0
      ? filteredOnboarding.filter((o: any) => selectedIds.has(o.id))
      : filteredOnboarding;

    return source.map((item: any) => ({
      candidateName: item.candidate?.fullName || "—",
      email: item.candidate?.email || "—",
      joiningDate: item.joiningDate,
      progress: getProgress(item.tasks),
      status: item.status || "pending",
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel({
      title: "Candidate Pre-Joining & Onboarding",
      columns: onboardingExportColumns,
      data: getExportData(),
      filename: `candidate-onboarding-export-${format(new Date(), "yyyyMMdd")}`,
      sheetName: "Onboarding",
    });
    toast.success(`Exported ${getExportData().length} onboarding records to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Candidate Pre-Joining & Onboarding",
      columns: onboardingExportColumns,
      data: getExportData(),
      filename: `candidate-onboarding-export-${format(new Date(), "yyyyMMdd")}`,
    });
    toast.success(`Exported ${getExportData().length} onboarding records to PDF.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Candidate Pre-Joining & Onboarding"
          description="Pre-hire task tracking, document verification, background checks, and asset readiness before Day 1."
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Onboarding"
          value={onboardingList.length.toString()}
          description="Pre-joining candidates"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="In Progress"
          value={onboardingList.filter((o: any) => o.status === "in_progress" || o.status === "pending").length.toString()}
          description="Documents pending"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Ready to Join"
          value={onboardingList.filter((o: any) => o.status === "ready_to_join").length.toString()}
          description="100% verified checklists"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Completed / Joined"
          value={onboardingList.filter((o: any) => o.status === "joined").length.toString()}
          description="Converted to employee"
          icon={<UserCheck className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search candidates by name or email..."
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
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready_to_join">Ready to Join</SelectItem>
              <SelectItem value="joined">Joined</SelectItem>
            </SelectContent>
          </Select>
        }
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
      />

      {/* Onboarding List */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Pipeline</CardTitle>
          <CardDescription>
            Candidates with accepted offers undergoing pre-boarding compliance and equipment provisioning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllVisibleSelected(visibleCandidateIds) ? true : isSomeVisibleSelected(visibleCandidateIds) ? "indeterminate" : false}
                    onCheckedChange={() => selectAllVisible(visibleCandidateIds)}
                    aria-label="Select all visible candidates"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Expected Joining Date</TableHead>
                <TableHead>Checklist Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : filteredOnboarding.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== "all"
                      ? "No candidates match your filter criteria."
                      : "No candidates currently in onboarding."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOnboarding.map((item: any) => {
                  const progress = getProgress(item.tasks);
                  const checked = isSelected(item.id);
                  return (
                    <TableRow
                      key={item.id}
                      data-state={checked ? "selected" : undefined}
                      className="hover:bg-muted/40 cursor-pointer"
                      onClick={() => toggleRow(item.id)}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRow(item.id)}
                          aria-label={`Select candidate ${item.candidate?.fullName || "candidate"}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{item.candidate?.fullName}</div>
                        <div className="text-xs text-muted-foreground">{item.candidate?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {new Date(item.joiningDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-48 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progress}% complete</span>
                            <span>{item.tasks?.filter((t: any) => t.status === "verified").length}/{item.tasks?.length || 0}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            progress === 100
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-500/10 text-blue-600"
                          }
                        >
                          {progress === 100 ? "Ready to Join" : item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOnboarding(item)}
                          className="gap-1 text-xs"
                        >
                          <Eye className="h-3 w-3" /> View Tasks
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
            total={filteredOnboarding.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* Tasks Modal */}
      <Dialog open={!!selectedOnboarding} onOpenChange={(open) => !open && setSelectedOnboarding(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Onboarding Checklist: {selectedOnboarding?.candidate?.fullName}
            </DialogTitle>
            <DialogDescription>
              Joining on {selectedOnboarding?.joiningDate ? new Date(selectedOnboarding.joiningDate).toLocaleDateString() : "--"}. Verify each task before converting to permanent employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedOnboarding?.tasks?.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">No tasks assigned.</div>
            ) : (
              selectedOnboarding?.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  className="p-3 border rounded-lg flex items-center justify-between gap-3 bg-card"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      {task.status === "verified" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600" />
                      )}
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground">{task.description}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={task.status}
                      onValueChange={(val) => taskMutation.mutate({ taskId: task.id, status: val })}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="waived">Waived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOnboarding(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
