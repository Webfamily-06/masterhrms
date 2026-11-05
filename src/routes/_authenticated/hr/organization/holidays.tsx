import { useState, useMemo } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sun,
  Search,
  RotateCcw,
  AlertTriangle,
  Tags,
  Building,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hr/organization/holidays")({
  component: HolidaysPage,
  head: () => ({
    meta: [{ title: "Holidays Management — Master HRMS" }],
  }),
});

interface HolidayRecord {
  id?: string;
  name: string;
  date: string;
  type: string;
  year: number;
  description?: string;
  branchIds?: string[];
  status: "active" | "inactive";
  allowedActions?: string[];
}

interface HolidayTypeRecord {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: "active" | "inactive";
}

const currentYear = new Date().getFullYear();

const initialHoliday: HolidayRecord = {
  name: "",
  date: new Date().toISOString().split("T")[0],
  type: "Public Holiday",
  year: currentYear,
  description: "",
  branchIds: [],
  status: "active",
};

export function HolidaysPage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTypesManagerOpen, setIsTypesManagerOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<HolidayRecord | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    id: string;
    name: string;
    targetStatus: "active" | "inactive";
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Load Holiday Types
  const { data: holidayTypesData, refetch: refetchTypes } = useQuery<{ data: HolidayTypeRecord[] }>({
    queryKey: ["holiday-types-list"],
    queryFn: async () => {
      const res = await api.get<{ data: HolidayTypeRecord[] }>("/hr/organization/holiday-types?limit=100");
      return res || { data: [] };
    },
  });
  const holidayTypes: HolidayTypeRecord[] = useMemo(() => {
    return Array.isArray(holidayTypesData?.data) ? holidayTypesData.data : [];
  }, [holidayTypesData]);

  // Load Branches for applicability selector
  const { data: branchesData } = useQuery<any>({
    queryKey: ["branches-selector-list"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/hr/organization/branches?limit=100");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const branches: { id: string; name: string }[] = useMemo(() => {
    return Array.isArray(branchesData) ? branchesData : [];
  }, [branchesData]);

  // Extra filter parameters
  const extraParams = useMemo(() => {
    const params: Record<string, any> = { year: selectedYear };
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.type = typeFilter;
    return params;
  }, [selectedYear, statusFilter, typeFilter]);

  const {
    data: holidays,
    total,
    totalPages,
    counts,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    isLoading,
    setPage,
    setLimit,
    setSearch,
    setSortBy,
    setSortOrder,
    refetch,
  } = useMasterList<HolidayRecord>({
    endpoint: "/hr/organization/holidays",
    queryKey: "holidays-list",
    defaultLimit: 10,
    defaultSortBy: "date",
    defaultSortOrder: "asc",
    extraParams,
  });

  const {
    values,
    setValues,
    handleChange,
    submit,
    isSubmitting,
    isEditMode,
    reset,
  } = useMasterForm<HolidayRecord>({
    endpoint: "/hr/organization/holidays",
    queryKeyToInvalidate: "holidays-list",
    initialValues: initialHoliday,
    onSuccess: () => {
      setIsDialogOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      refetch();
    },
  });

  // Single delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/holidays/${id}`);
    },
    onSuccess: () => {
      toast.success("Holiday deleted successfully");
      setDeleteConfirmTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmTarget?.id));
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to delete holiday";
      toast.error(msg);
    },
  });

  // Archive / Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/hr/organization/holidays/${id}`, { status: newStatus });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === "inactive"
          ? "Holiday de-activated"
          : "Holiday activated"
      );
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update holiday status");
    },
  });

  // Bulk de-activate mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/holidays/bulk-archive", { ids, status: "inactive" });
    },
    onSuccess: (res: any) => {
      toast.success(`De-activated ${res.data?.count || selectedIds.length} holiday(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to bulk de-activate holidays");
    },
  });

  // Manage Types state & mutations
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#10b981");

  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      return await api.post("/hr/organization/holiday-types", data);
    },
    onSuccess: () => {
      toast.success("Holiday type added successfully");
      setNewTypeName("");
      setNewTypeDescription("");
      refetchTypes();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create holiday type");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/holiday-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Holiday type deleted");
      refetchTypes();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Cannot delete holiday type");
    },
  });

  // Open Add Dialog
  const handleOpenAdd = () => {
    reset();
    setValues({
      ...initialHoliday,
      year: selectedYear,
      date: `${selectedYear}-01-01`,
      type: holidayTypes[0]?.name || "Public Holiday",
    });
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (h: HolidayRecord) => {
    const dateStr = typeof h.date === "string" ? h.date.split("T")[0] : format(new Date(h.date), "yyyy-MM-dd");
    setValues({
      ...h,
      date: dateStr,
      branchIds: Array.isArray(h.branchIds) ? h.branchIds : [],
    });
    setIsDialogOpen(true);
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = holidays.map((h: any) => h.id).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(holidays.map((h: any) => h.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const currentPageIds = holidays.map((h: any) => h.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  // Duplicate date check warning in form
  const isDuplicateDate = useMemo(() => {
    if (!values.date) return false;
    const targetDateStr = values.date.split("T")[0];
    return holidays.some(
      (h: any) =>
        h.id !== values.id &&
        h.status === "active" &&
        (typeof h.date === "string" ? h.date.split("T")[0] : format(new Date(h.date), "yyyy-MM-dd")) === targetDateStr
    );
  }, [values.date, values.id, holidays]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays Management"
        description="Statutory national holidays, corporate festivals, and branch-specific leave dates."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                setSelectedYear(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-28 sm:w-32 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Year {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTypesManagerOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Tags className="h-4 w-4 text-muted-foreground" />
              Manage Types
            </Button>

            <Button onClick={handleOpenAdd} className="h-9 gap-2 text-xs">
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          </div>
        }
      />

      {/* Top Authoritative Summary Cards */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          title={`Total Holidays (${selectedYear})`}
          value={counts?.total ?? total}
          icon={CalendarDays}
          variant="info"
          className="bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card border-blue-200/80 hover:border-blue-400 dark:border-blue-800/40 dark:hover:border-blue-700 hover:shadow-xs transition-all duration-200"
          description="Total scheduled non-working days"
        />
        <StatCard
          title="Mandatory / Public"
          value={(counts as any)?.public ?? 0}
          icon={CheckCircle2}
          variant="success"
          className="bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-700 hover:shadow-xs transition-all duration-200"
          description="Statutory public & national closures"
        />
        <StatCard
          title="Optional / Restricted"
          value={(counts as any)?.optional ?? 0}
          icon={Sun}
          variant="warning"
          className="bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card border-amber-200/80 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-700 hover:shadow-xs transition-all duration-200"
          description="Floating & restricted festival holidays"
        />
      </StatsOverviewGrid>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search holidays by name or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {holidayTypes.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setPage(1);
                }}
                className="h-9 gap-1 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Indicator */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-t pt-2 sm:border-t-0 sm:pt-0">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkArchiveMutation.isPending}
              onClick={() => bulkArchiveMutation.mutate(selectedIds)}
              className="h-8 gap-1 text-xs"
            >
              <PowerOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              De-activate Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all on current page"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1.5">
                  Holiday Name
                  {sortBy === "name" && (
                    <span className="text-xs text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1.5">
                  Date & Day
                  {sortBy === "date" && (
                    <span className="text-xs text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead className="font-semibold">Classification</TableHead>
              <TableHead className="font-semibold">Applicability</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Loading holidays schedule...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <div className="mx-auto max-w-sm space-y-2">
                    <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No holidays found</p>
                    <p className="text-xs">
                      {search || statusFilter !== "all" || typeFilter !== "all"
                        ? "Try clearing your filters or search terms."
                        : `No holidays registered for year ${selectedYear}. Use 'Add Holiday' to schedule dates.`}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h: any) => {
                const dateObj = new Date(h.date);
                const isValidDate = !isNaN(dateObj.getTime());
                const formattedDate = isValidDate ? format(dateObj, "dd MMM yyyy") : h.date;
                const dayOfWeek = isValidDate ? format(dateObj, "EEEE") : "—";
                const isSelected = selectedIds.includes(h.id);
                const isInactive = h.status === "inactive";

                return (
                  <TableRow
                    key={h.id || h.name}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      isSelected && "bg-muted/60",
                      isInactive && "opacity-75"
                    )}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(h.id, Boolean(checked))}
                        aria-label={`Select ${h.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className={cn(isInactive && "line-through text-muted-foreground")}>
                        {h.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{dayOfWeek}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal"
                        style={{
                          borderColor:
                            h.type?.toLowerCase().includes("public") || h.type?.toLowerCase().includes("national")
                              ? "rgba(16, 185, 129, 0.4)"
                              : h.type?.toLowerCase().includes("optional")
                              ? "rgba(245, 158, 11, 0.4)"
                              : "rgba(59, 130, 246, 0.4)",
                          backgroundColor:
                            h.type?.toLowerCase().includes("public") || h.type?.toLowerCase().includes("national")
                              ? "rgba(16, 185, 129, 0.1)"
                              : h.type?.toLowerCase().includes("optional")
                              ? "rgba(245, 158, 11, 0.1)"
                              : "rgba(59, 130, 246, 0.1)",
                        }}
                      >
                        {h.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(h.branchIds) && h.branchIds.length > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building className="h-3.5 w-3.5" />
                          <span>{h.branchIds.length} branch facility(ies)</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">All Facilities</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {h.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isInactive ? "outline" : "default"}
                        className={cn(
                          "capitalize text-[11px]",
                          !isInactive && "bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 border-emerald-500/30 dark:text-emerald-400"
                        )}
                      >
                        {h.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(h)}
                          className="h-8 gap-1.5 text-xs font-medium"
                          title="Edit holiday details"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggleStatusMutation.isPending}
                          onClick={() =>
                            setStatusConfirmTarget({
                              id: h.id,
                              name: h.name,
                              targetStatus: isInactive ? "active" : "inactive",
                            })
                          }
                          className={cn(
                            "h-8 gap-1.5 text-xs font-medium",
                            isInactive
                              ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          )}
                          title={isInactive ? "Activate holiday" : "De-activate holiday"}
                        >
                          {isInactive ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Activate
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-3.5 w-3.5" />
                              De-activate
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmTarget(h)}
                          className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          title="Delete holiday permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination & Page Size Selector Controls */}
        <div className="flex flex-col items-center justify-between gap-4 border-t p-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2">
              Showing page {page} of {totalPages || 1} ({total} total records)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="h-8 px-2 text-xs"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 px-2.5 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 px-2.5 text-xs"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="h-8 px-2 text-xs"
            >
              Last
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure statutory closures, regional festivals, or corporate non-working dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name" className="text-xs font-semibold">
                Holiday Title *
              </Label>
              <Input
                id="holiday-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Independence Day, Annual Founder's Day"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-date" className="text-xs font-semibold">
                  Date *
                </Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={values.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    handleChange("date", newDate);
                    if (newDate) {
                      handleChange("year", new Date(newDate).getFullYear());
                    }
                  }}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="holiday-type" className="text-xs font-semibold">
                  Classification *
                </Label>
                <Select
                  value={values.type}
                  onValueChange={(val: any) => handleChange("type", val)}
                >
                  <SelectTrigger id="holiday-type" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {holidayTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.color || "#10b981" }}
                          />
                          <span>{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duplicate Date Warning Alert */}
            {isDuplicateDate && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Notice: Another active holiday is already scheduled on this date.
                </span>
              </div>
            )}

            {/* Branch Applicability Restriction */}
            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Applicability</Label>
                <div className="rounded-md border p-2 text-xs space-y-1.5 max-h-28 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="branch-all"
                      checked={!values.branchIds || values.branchIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) handleChange("branchIds", []);
                      }}
                    />
                    <label htmlFor="branch-all" className="cursor-pointer text-muted-foreground">
                      All Facilities (Organization-wide)
                    </label>
                  </div>
                  {branches.map((b) => {
                    const isSelected = Array.isArray(values.branchIds) && values.branchIds.includes(b.id);
                    return (
                      <div key={b.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`branch-${b.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(values.branchIds) ? values.branchIds : [];
                            if (checked) {
                              handleChange("branchIds", [...current, b.id]);
                            } else {
                              handleChange("branchIds", current.filter((id: string) => id !== b.id));
                            }
                          }}
                        />
                        <label htmlFor={`branch-${b.id}`} className="cursor-pointer">
                          {b.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="holiday-desc" className="text-xs font-semibold">
                Description / Guidelines
              </Label>
              <Input
                id="holiday-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional notes or operational observance guidelines"
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Holiday Types Manager Dialog */}
      <Dialog open={isTypesManagerOpen} onOpenChange={setIsTypesManagerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              Manage Holiday Types
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define standard or custom holiday categories observed across your organization.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Create Section */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">Add Custom Holiday Type</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <Input
                  placeholder="Type Name (e.g. Founders Day)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newTypeColor}
                  onChange={(e) => setNewTypeColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border p-0.5"
                  title="Choose badge color"
                />
                <Button
                  size="sm"
                  disabled={!newTypeName.trim() || createTypeMutation.isPending}
                  onClick={() => {
                    createTypeMutation.mutate({
                      name: newTypeName.trim(),
                      description: newTypeDescription.trim() || undefined,
                      color: newTypeColor,
                    });
                  }}
                  className="h-8 text-xs flex-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
            <Input
              placeholder="Optional description"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Existing Types List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            <span className="text-xs font-semibold text-muted-foreground">Active Classifications</span>
            {holidayTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No custom types defined.</p>
            ) : (
              holidayTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || "#10b981" }}
                    />
                    <div>
                      <span className="font-medium text-foreground">{t.name}</span>
                      {t.description && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteTypeMutation.isPending}
                    onClick={() => deleteTypeMutation.mutate(t.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Delete type (only allowed if unassigned)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTypesManagerOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* De-activate / Activate Confirmation Dialog */}
      <Dialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(open) => !open && setStatusConfirmTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <>
                  <PowerOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  De-activate Holiday
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Activate Holiday
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {statusConfirmTarget?.targetStatus === "inactive" ? (
                <span>
                  Are you sure you want to de-activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This date will be marked as inactive and will be excluded from the authoritative
                  organization calendar projection. Historical records will remain preserved.
                </span>
              ) : (
                <span>
                  Are you sure you want to activate{" "}
                  <strong className="text-foreground">{statusConfirmTarget?.name}</strong>?
                  This holiday will become active and will be restored to company and employee calendars.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={toggleStatusMutation.isPending}
              onClick={() => setStatusConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                statusConfirmTarget?.targetStatus === "inactive"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (statusConfirmTarget) {
                  toggleStatusMutation.mutate({
                    id: statusConfirmTarget.id,
                    newStatus: statusConfirmTarget.targetStatus,
                  });
                  setStatusConfirmTarget(null);
                }
              }}
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : statusConfirmTarget?.targetStatus === "inactive"
                ? "De-activate"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Dependency Guard Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmTarget)}
        onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Holiday</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteConfirmTarget?.name}</strong>?
              This action will permanently remove this holiday from the schedule and the organization calendar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmTarget?.id) {
                  deleteMutation.mutate(deleteConfirmTarget.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
