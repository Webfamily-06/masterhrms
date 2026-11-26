'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Link, useRouterState } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { GlobalExportDropdown } from "@/components/ui/global-export-dropdown";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
  Calendar,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HolidayRecord {
  id?: string;
  name: string;
  date: string;
  type: string;
  year: number;
  description?: string;
  branchIds?: string[];
  status: "active" | "inactive";
}

const currentYear = new Date().getFullYear();

const DEFAULT_CATEGORIES = [
  "National",
  "Company-specific",
  "Religious",
  "Regional",
  "Public Holiday",
];

const initialHoliday: HolidayRecord = {
  name: "",
  date: new Date().toISOString().split("T")[0],
  type: "National",
  year: currentYear,
  description: "",
  branchIds: [],
  status: "active",
};

function formatDateYmd(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "—";
  }
}

function getCategoryPillClass(category?: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("national") || c.includes("public")) {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
  }
  if (c.includes("company")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  }
  if (c.includes("religious")) {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25";
  }
  if (c.includes("regional") || c.includes("optional")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
  }
  return "bg-primary/10 text-primary border-primary/25";
}

function buildGoogleCalendarUrl(holiday: HolidayRecord) {
  const ymd = formatDateYmd(holiday.date).replace(/-/g, "");
  if (!/^\d{8}$/.test(ymd)) return "https://calendar.google.com/calendar/render?action=TEMPLATE";
  // All-day event end date in Google Calendar is exclusive (+1 day)
  const startObj = new Date(holiday.date);
  const nextDay = new Date(startObj.getTime() + 24 * 60 * 60 * 1000);
  const endYmd = format(nextDay, "yyyyMMdd");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: holiday.name,
    dates: `${ymd}/${endYmd}`,
    details: holiday.description || `${holiday.type || "Company"} Holiday`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateIcsContent(holidays: HolidayRecord[], yearLabel: number | string) {
  const nowStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Master HRMS//Holiday Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Master HRMS Holidays ${yearLabel}`,
  ];

  for (const h of holidays) {
    const startObj = new Date(h.date);
    if (isNaN(startObj.getTime())) continue;
    const endObj = new Date(startObj.getTime() + 24 * 60 * 60 * 1000);
    const dtStart = format(startObj, "yyyyMMdd");
    const dtEnd = format(endObj, "yyyyMMdd");
    const uid = `holiday-${h.id || dtStart}@masterhrms.local`;
    const summary = (h.name || "Holiday").replace(/[,;\\]/g, "\\$&");
    const desc = (h.description || `${h.type || "Company"} Holiday`).replace(/[,;\\]/g, "\\$&");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `CATEGORIES:${(h.type || "Holiday").toUpperCase()}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function HolidaysPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<HolidayRecord | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<HolidayRecord | null>(null);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: holidayTypesData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ["holiday-types-list"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/holiday-types?limit=100");
      return res || { data: [] };
    },
  });

  const categories = useMemo(() => {
    const dynamicNames = Array.isArray(holidayTypesData?.data)
      ? holidayTypesData.data.map((t) => t.name).filter(Boolean)
      : [];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...dynamicNames]));
  }, [holidayTypesData]);

  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) {
      if (b?.id) map.set(b.id, b.name);
    }
    return map;
  }, [branches]);

  const extraParams = useMemo(() => {
    const params: Record<string, any> = { year: selectedYear };
    if (categoryFilter !== "all") params.type = categoryFilter;
    return params;
  }, [selectedYear, categoryFilter]);

  const {
    data: rawHolidays,
    total,
    totalPages,
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
    defaultLimit: 15,
    defaultSortBy: "date",
    defaultSortOrder: "asc",
    extraParams,
  });

  // Client-side date range refinement (From / To date)
  const holidays = useMemo(() => {
    return rawHolidays.filter((h) => {
      const ymd = formatDateYmd(h.date);
      if (fromDate && ymd < fromDate) return false;
      if (toDate && ymd > toDate) return false;
      return true;
    });
  }, [rawHolidays, fromDate, toDate]);

  const syncApplicationCalendar = () => {
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
  };

  const {
    values,
    setValues,
    isSubmitting,
    errors: formErrors,
    setErrors,
    handleChange,
    submit: handleSubmit,
    reset,
    isEditMode: isEdit,
  } = useMasterForm<HolidayRecord>({
    endpoint: "/hr/organization/holidays",
    initialValues: initialHoliday,
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      syncApplicationCalendar();
      refetch();
    },
  });
  const error = formErrors._form || Object.values(formErrors)[0] || null;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/holidays/${id}`);
    },
    onSuccess: () => {
      toast.success("Holiday deleted and synced with calendar.");
      setDeleteConfirmTarget(null);
      syncApplicationCalendar();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete holiday.");
    },
  });

  const openCreate = () => {
    reset();
    setValues({
      ...initialHoliday,
      year: selectedYear,
      date: `${selectedYear}-01-01`,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (h: HolidayRecord) => {
    const ymd = formatDateYmd(h.date);
    setValues({
      id: h.id,
      name: h.name || "",
      date: ymd !== "—" ? ymd : `${selectedYear}-01-01`,
      type: h.type || "National",
      year: h.year || selectedYear,
      description: h.description || "",
      branchIds: Array.isArray(h.branchIds) ? h.branchIds : [],
      status: h.status || "active",
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setSelectedYear(currentYear);
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  // Export columns & handlers (PDF + Excel using GlobalExportDropdown public icons)
  const exportColumns: ExportColumn[] = [
    { header: "#", key: "index", width: 8 },
    { header: "Holiday Name", key: "name", width: 28 },
    { header: "Date", key: "date", width: 16 },
    { header: "Category", key: "category", width: 20 },
    { header: "Branches", key: "branches", width: 32 },
  ];

  const getExportRows = () =>
    holidays.map((h, idx) => {
      const bIds = Array.isArray(h.branchIds) ? h.branchIds : [];
      const bNames =
        bIds.length === 0
          ? "All Branches"
          : bIds.map((id) => branchNameMap.get(id) || id).join(", ");
      return {
        index: idx + 1,
        name: h.name,
        date: formatDateYmd(h.date),
        category: h.type || "National",
        branches: bNames,
      };
    });

  const handleExportExcel = async () => {
    await exportToExcel({
      title: `Holidays (${selectedYear})`,
      columns: exportColumns,
      data: getExportRows(),
      filename: `holidays-${selectedYear}`,
      sheetName: "Holidays",
    });
    toast.success(`Exported ${holidays.length} holidays to Excel.`);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: `Company Holidays — ${selectedYear}`,
      columns: exportColumns,
      data: getExportRows(),
      filename: `holidays-${selectedYear}`,
    });
    toast.success(`Exported ${holidays.length} holidays to PDF.`);
  };

  const handleExportIcal = () => {
    if (holidays.length === 0) {
      toast.info("No holidays available to export.");
      return;
    }
    const ics = generateIcsContent(holidays, selectedYear);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `masterhrms-holidays-${selectedYear}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${holidays.length} holidays as iCal (.ics) — ready for Google & Apple Calendar.`);
  };

  const toggleBranchSelection = (branchId: string) => {
    const current = Array.isArray(values.branchIds) ? values.branchIds : [];
    const next = current.includes(branchId)
      ? current.filter((id) => id !== branchId)
      : [...current, branchId];
    handleChange("branchIds", next);
  };

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const startRow = holidays.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total || holidays.length);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Holidays"
        description="Manage public and company holidays."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={isEmployeePortal ? "/me/calendar" : "/hr/calendar"}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar View
              </Button>
            </Link>

            <GlobalExportDropdown
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              totalFilteredCount={holidays.length}
              disabled={holidays.length === 0}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportIcal}
              disabled={holidays.length === 0}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              Export iCal
            </Button>

            {!isEmployeePortal && (
              <Button
                type="button"
                onClick={openCreate}
                className="h-9 px-4 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Holiday
              </Button>
            )}
          </div>
        }
      />

      {/* ── Filter Toolbar Card ── */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[155px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                setSelectedYear(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px] h-9 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
              className="w-[155px] h-9 text-xs bg-background"
            />

            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
              className="w-[155px] h-9 text-xs bg-background"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {/* Active Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/80 bg-muted/40 text-[11px] font-medium text-foreground">
            Year: {selectedYear}
          </span>
          {categoryFilter !== "all" && (
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/80 bg-muted/40 text-[11px] font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              Category: {categoryFilter}
              <X className="h-3 w-3" />
            </button>
          )}
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/80 bg-muted/40 text-[11px] font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              Range: {fromDate || "…"} to {toDate || "…"}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Holidays Data Table Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
                <TableHead className="w-12 text-xs font-semibold text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Holiday Name
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("date")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Date
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Branches</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    Loading holidays...
                  </TableCell>
                </TableRow>
              ) : holidays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-7 w-7 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No holidays found for {selectedYear}</p>
                      <p className="text-xs">Click Add Holiday to publish a holiday — it auto-syncs with Company Calendar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                holidays.map((holiday, idx) => {
                  const rowNum = (page - 1) * limit + idx + 1;
                  const bIds = Array.isArray(holiday.branchIds) ? holiday.branchIds : [];
                  const firstBranchName =
                    bIds.length > 0
                      ? branchNameMap.get(bIds[0]) || "Branch"
                      : branches[0]?.name || "All Branches";
                  const extraBranchCount =
                    bIds.length > 1
                      ? bIds.length - 1
                      : bIds.length === 0 && branches.length > 1
                        ? branches.length - 1
                        : 0;

                  return (
                    <TableRow
                      key={holiday.id || idx}
                      className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                    >
                      <TableCell className="text-xs font-semibold text-foreground">{rowNum}</TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">{holiday.name}</TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span>{formatDateYmd(holiday.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5 rounded-md",
                            getCategoryPillClass(holiday.type)
                          )}
                        >
                          {holiday.type || "National"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/80 bg-muted/40 text-[11px] font-medium text-foreground">
                            {firstBranchName}
                          </span>
                          {extraBranchCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/80 bg-muted/40 text-[11px] font-medium text-muted-foreground">
                              +{extraBranchCount} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View Holiday & Google Calendar Sync"
                            onClick={() => setViewTarget(holiday)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isEmployeePortal && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Holiday"
                                onClick={() => openEdit(holiday)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete Holiday"
                                onClick={() => setDeleteConfirmTarget(holiday)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/70 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startRow}</span> to{" "}
            <span className="font-semibold text-foreground">{endRow}</span> of{" "}
            <span className="font-semibold text-foreground">{total || holidays.length}</span> results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                &laquo; Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next &raquo;
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── View Holiday & Google Calendar Quick Add Dialog ── */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name}</DialogTitle>
            <DialogDescription>Holiday details &amp; calendar sync</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-semibold text-foreground mt-0.5">{formatDateYmd(viewTarget.date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-semibold text-foreground mt-0.5">{viewTarget.type || "National"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Description</span>
                  <p className="font-medium text-foreground mt-0.5">{viewTarget.description || "—"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/70">
                <a
                  href={buildGoogleCalendarUrl(viewTarget)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Add to Google Calendar
                  </Button>
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    const ics = generateIcsContent([viewTarget], viewTarget.year || selectedYear);
                    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${viewTarget.name.toLowerCase().replace(/\s+/g, "-")}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .ics
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Holiday Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription>
              Saved holidays automatically sync with the application Company Calendar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Holiday Name *</Label>
                <Input
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Independence Day"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date *</Label>
                <Input
                  type="date"
                  value={values.date}
                  onChange={(e) => {
                    handleChange("date", e.target.value);
                    const yr = Number(e.target.value.slice(0, 4));
                    if (!isNaN(yr) && yr > 2000) handleChange("year", yr);
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select
                  value={values.type || "National"}
                  onValueChange={(val) => handleChange("type", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={values.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Optional note about this holiday"
                />
              </div>

              {branches.length > 0 && (
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-semibold">
                    Applicable Branches <span className="font-normal text-muted-foreground">(leave unchecked for all branches)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto rounded-lg border border-border/70 p-2.5">
                    {branches.map((b: any) => {
                      const checked = Array.isArray(values.branchIds) && values.branchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 text-xs cursor-pointer select-none"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleBranchSelection(b.id)}
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Holiday Dialog ── */}
      <Dialog open={Boolean(deleteConfirmTarget)} onOpenChange={(o) => !o && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmTarget?.name}</strong>? It will also be removed from the Company Calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmTarget?.id && deleteMutation.mutate(deleteConfirmTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
