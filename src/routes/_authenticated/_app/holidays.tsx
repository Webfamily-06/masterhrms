import { format } from "date-fns";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  ChevronRight,
  Sun,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar as CalendarIcon,
  List,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/holidays")({
  component: HolidaysPage,
  head: () => ({
    meta: [{ title: "Holidays Management — Master HRMS" }],
  }),
});

export interface HolidayRecord {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string;
  type: "public" | "national" | "company" | "optional";
  description?: string;
  status: "active" | "inactive";
}

export function HolidaysPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  // Search & Filter
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRecord | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<HolidayRecord | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<HolidayRecord["type"]>("national");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  // Query Holidays dynamically from MySQL database
  const { data: holidays = [], isLoading } = useQuery<HolidayRecord[]>({
    queryKey: ["tenant-holidays", tenantId],
    queryFn: async () => {
      try {
        const rows = await api.get("/workspace/holidays");
        if (Array.isArray(rows)) {
          return rows.map((r: any) => ({
            id: r.id,
            title: r.name,
            date: format(new Date(r.date), "yyyy-MM-dd"),
            dayOfWeek: format(new Date(r.date), "EEEE"),
            type: (r.type || "public") as HolidayRecord["type"],
            description: r.description || "",
            status: "active" as const,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // Create Mutation
  const createMut = useMutation({
    mutationFn: async (payload: { name: string; date: string; type: string; description: string }) => {
      await api.post("/workspace/holidays", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-holidays", tenantId] });
      toast.success("Holiday created.");
      setIsAddOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create holiday"),
  });

  // Delete Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspace/holidays/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-holidays", tenantId] });
      toast.success("Holiday removed.");
      setDeletingHoliday(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete holiday"),
  });

  // Filtered & Sorted
  const filtered = holidays
    .filter((h) => {
      const matchSearch =
        h.title.toLowerCase().includes(search.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(search.toLowerCase())) ||
        h.date.includes(search);
      const matchType = typeFilter === "all" ? true : h.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Stats
  const totalHolidays = holidays.length;
  const nowStr = new Date().toISOString().slice(0, 10);
  const upcomingHolidays = holidays.filter((h) => h.date >= nowStr).length;
  const nationalHolidays = holidays.filter((h) => h.type === "national").length;
  const publicHolidays = holidays.filter((h) => h.type === "public" || h.type === "company").length;

  function handleOpenAdd() {
    setFormTitle("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormType("national");
    setFormDesc("");
    setFormStatus("active");
    setIsAddOpen(true);
  }

  function handleOpenEdit(h: HolidayRecord) {
    setEditingHoliday(h);
    setFormTitle(h.title);
    setFormDate(h.date);
    setFormType(h.type);
    setFormDesc(h.description || "");
    setFormStatus(h.status);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return toast.error("Title and Date are required");

    const dateObj = new Date(formDate);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    const newRecord: HolidayRecord = {
      id: `hol-${Date.now()}`,
      title: formTitle.trim(),
      date: formDate,
      dayOfWeek: dayName,
      type: formType,
      description: formDesc.trim(),
      status: formStatus,
    };

    createMut.mutate({
      name: formTitle.trim(),
      date: formDate,
      type: formType,
      description: formDesc.trim(),
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHoliday) return;
    if (!formTitle.trim() || !formDate) return toast.error("Title and Date are required");

    const dateObj = new Date(formDate);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    const nextList = holidays.map((h) => {
      if (h.id === editingHoliday.id) {
        return {
          ...h,
          title: formTitle.trim(),
          date: formDate,
          dayOfWeek: dayName,
          type: formType,
          description: formDesc.trim(),
          status: formStatus,
        };
      }
      return h;
    });

    createMut.mutate({
      name: formTitle.trim(),
      date: formDate,
      type: formType,
      description: formDesc.trim(),
    });
    setEditingHoliday(null);
  }

  function handleDelete() {
    if (!deletingHoliday) return;
    deleteMut.mutate(deletingHoliday.id);
  }

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No holidays to export");
    const headers = ["Title", "Date", "Day of Week", "Category", "Description", "Status"];
    const rows = filtered.map((h) => [
      `"${h.title.replace(/"/g, '""')}"`,
      h.date,
      h.dayOfWeek || "—",
      h.type,
      `"${(h.description || "").replace(/"/g, '""')}"`,
      h.status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `holidays-calendar-${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Holidays exported to CSV!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb & Top Action Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" /> Holidays Calendar
          </h1>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Link to="/hrm-dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <Link to="/attendance" className="hover:text-foreground transition-colors">
              Attendance
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">Holidays</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* List vs Calendar Toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
            <Button
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              onClick={() => setViewMode("list")}
              className={`h-8 px-2.5 text-xs font-semibold gap-1 ${
                viewMode === "list" ? "bg-background shadow-2xs font-bold text-foreground" : "text-muted-foreground"
              }`}
            >
              <List className="size-3.5" /> List
            </Button>
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              onClick={() => setViewMode("calendar")}
              className={`h-8 px-2.5 text-xs font-semibold gap-1 ${
                viewMode === "calendar" ? "bg-background shadow-2xs font-bold text-foreground" : "text-muted-foreground"
              }`}
            >
              <CalendarIcon className="size-3.5" /> Calendar
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" /> Add Holiday
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
            <Sun className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Total Annual Holidays</div>
            <div className="text-xl font-black font-mono tracking-tight">{totalHolidays} Days</div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Upcoming This Year</div>
            <div className="text-xl font-black font-mono tracking-tight text-emerald-600">
              {upcomingHolidays} Days
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 shrink-0">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">National / Gazetted</div>
            <div className="text-xl font-black font-mono tracking-tight text-blue-600">
              {nationalHolidays} Days
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card flex items-center gap-3">
          <div className="size-11 rounded-xl bg-purple-500/10 grid place-items-center text-purple-600 shrink-0">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Company / Observance</div>
            <div className="text-xl font-black font-mono tracking-tight text-purple-600">
              {publicHolidays} Days
            </div>
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────── */}
      <Card className="p-4 border shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holiday name, date (YYYY-MM), or description..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="national">National Holiday</SelectItem>
                <SelectItem value="public">Public / Cultural</SelectItem>
                <SelectItem value="company">Company Mandatory</SelectItem>
                <SelectItem value="optional">Optional / Floating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── VIEW: LIST TABLE OR CALENDAR GRID ───────────────────────────── */}
      {viewMode === "list" ? (
        <Card className="border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        filtered.length > 0 && selectedIds.length === filtered.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(filtered.map((h) => h.id));
                        else setSelectedIds([]);
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">
                    Holiday Title
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">
                    Date & Day
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading holidays...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No holidays scheduled matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((h) => {
                    const isChecked = selectedIds.includes(h.id);
                    const formattedDate = new Date(h.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const isUpcoming = h.date >= nowStr;

                    return (
                      <TableRow key={h.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedIds((prev) => [...prev, h.id]);
                              else setSelectedIds((prev) => prev.filter((i) => i !== h.id));
                            }}
                            aria-label={`Select ${h.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary font-bold text-xs shrink-0">
                              <CalendarDays className="size-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-foreground block">
                                {h.title}
                              </span>
                              {isUpcoming && (
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  Upcoming
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-foreground">
                            {formattedDate}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {h.dayOfWeek || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {h.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                          {h.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            ACTIVE
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 hover:bg-secondary/80"
                              onClick={() => handleOpenEdit(h)}
                              title="Edit Holiday"
                            >
                              <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => setDeletingHoliday(h)}
                              title="Delete Holiday"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* ── CALENDAR VIEW (Monthly Visual Grid) ────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const monthDate = new Date(2026, monthIdx, 1);
            const monthName = monthDate.toLocaleDateString("en-US", { month: "long" });
            const monthHolidays = holidays.filter((h) => {
              const d = new Date(h.date);
              return d.getMonth() === monthIdx;
            });

            return (
              <Card key={monthIdx} className="p-4 border shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-primary" /> {monthName} 2026
                    </h4>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {monthHolidays.length} {monthHolidays.length === 1 ? "day" : "days"}
                    </Badge>
                  </div>

                  {monthHolidays.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center italic">
                      No holidays in {monthName}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {monthHolidays.map((h) => {
                        const dayNum = new Date(h.date).getDate();
                        return (
                          <div
                            key={h.id}
                            className="p-2 rounded-lg border bg-secondary/20 flex items-center justify-between text-xs hover:border-primary/40 transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold block truncate text-foreground">
                                {h.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                {h.dayOfWeek} • {h.type}
                              </span>
                            </div>
                            <span className="size-7 rounded-md bg-primary text-primary-foreground font-mono font-bold text-xs grid place-items-center shrink-0">
                              {dayNum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── ADD HOLIDAY MODAL (#add_holiday) ────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Add Holiday
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Holiday Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Independence Day, Diwali"
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Holiday Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National Holiday</SelectItem>
                    <SelectItem value="public">Public / Cultural</SelectItem>
                    <SelectItem value="company">Company Mandatory</SelectItem>
                    <SelectItem value="optional">Optional / Floating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief reason or notes about this holiday..."
                rows={3}
                className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={createMut.isPending || deleteMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || deleteMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {(createMut.isPending || deleteMut.isPending) ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Scheduling...
                  </>
                ) : (
                  "Add Holiday"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT HOLIDAY MODAL (#edit_holiday) ───────────────────────────── */}
      {editingHoliday && (
        <Dialog open={!!editingHoliday} onOpenChange={(o) => !o && setEditingHoliday(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" /> Edit Holiday
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Holiday Title *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Holiday Date *</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National Holiday</SelectItem>
                      <SelectItem value="public">Public / Cultural</SelectItem>
                      <SelectItem value="company">Company Mandatory</SelectItem>
                      <SelectItem value="optional">Optional / Floating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingHoliday(null)}
                  disabled={createMut.isPending || deleteMut.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending || deleteMut.isPending}
                  className="font-bold bg-primary text-primary-foreground"
                >
                  {(createMut.isPending || deleteMut.isPending) ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DELETE HOLIDAY MODAL (#delete_modal) ─────────────────────────── */}
      {deletingHoliday && (
        <Dialog open={!!deletingHoliday} onOpenChange={(o) => !o && setDeletingHoliday(null)}>
          <DialogContent className="max-w-sm text-center">
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto grid place-items-center mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-center">
                Delete Holiday?
              </DialogTitle>
            </DialogHeader>

            <div className="text-xs text-muted-foreground space-y-2 py-2">
              <p>
                Are you sure you want to remove <strong>{deletingHoliday.title}</strong> (
                {deletingHoliday.date})?
              </p>
            </div>

            <DialogFooter className="gap-2 sm:justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingHoliday(null)}
                disabled={createMut.isPending || deleteMut.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={createMut.isPending || deleteMut.isPending}
                className="font-bold"
              >
                {(createMut.isPending || deleteMut.isPending) ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
