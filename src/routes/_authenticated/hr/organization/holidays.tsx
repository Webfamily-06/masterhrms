import { useState } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, Plus, Edit2, Calendar, Sun, CheckCircle } from "lucide-react";

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
  type: "public" | "national" | "company" | "optional";
  year: number;
  description?: string;
  branchIds?: string[];
  allowedActions?: string[];
}

const currentYear = new Date().getFullYear();

const initialHoliday: HolidayRecord = {
  name: "",
  date: new Date().toISOString().split("T")[0],
  type: "public",
  year: currentYear,
  description: "",
  branchIds: [],
};

export function HolidaysPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const {
    data: holidays,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
    refetch,
  } = useMasterList<HolidayRecord>({
    endpoint: "/hr/organization/holidays",
    queryKey: "holidays-list",
    defaultLimit: 25,
    defaultSortBy: "date",
    defaultSortOrder: "asc",
    extraParams: { year: selectedYear },
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
      refetch();
    },
  });

  const handleOpenAdd = () => {
    reset();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (h: HolidayRecord) => {
    setValues({
      ...h,
      date: typeof h.date === "string" ? h.date.split("T")[0] : format(new Date(h.date), "yyyy-MM-dd"),
    });
    setIsDialogOpen(true);
  };

  const publicCount = holidays.filter((h) => h.type === "public" || h.type === "national").length;
  const optionalCount = holidays.filter((h) => h.type === "optional").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays Management"
        description="Statutory national holidays, corporate festivals, and branch-specific leave dates."
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger className="w-32">
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

            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          </div>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title={`Total Holidays (${selectedYear})`}
          value={total}
          icon={CalendarDays}
          description="Total scheduled non-working days"
        />
        <StatCard
          title="Mandatory / Public"
          value={publicCount}
          icon={CheckCircle}
          description="All-hands statutory closures"
        />
        <StatCard
          title="Optional / Restricted"
          value={optionalCount}
          icon={Sun}
          description="Floating / optional festivals"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search holidays by name or description..."
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holiday Name</TableHead>
              <TableHead>Date & Day</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading holidays schedule...
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No holidays registered for {selectedYear}.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => {
                const dateObj = new Date(h.date);
                const isValidDate = !isNaN(dateObj.getTime());
                const formattedDate = isValidDate ? format(dateObj, "dd MMM yyyy") : h.date;
                const dayOfWeek = isValidDate ? format(dateObj, "EEEE") : "—";

                return (
                  <TableRow key={h.id || h.name}>
                    <TableCell className="font-semibold text-foreground">
                      {h.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{dayOfWeek}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.type === "national" || h.type === "public"
                            ? "default"
                            : h.type === "optional"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {h.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {h.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(h)}
                        className="h-8 gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
            <span>
              Showing page {page} of {totalPages} ({total} total records)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name">Holiday Title *</Label>
              <Input
                id="holiday-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Independence Day"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-date">Date *</Label>
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
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="holiday-type">Type</Label>
                <Select
                  value={values.type}
                  onValueChange={(val: any) => handleChange("type", val)}
                >
                  <SelectTrigger id="holiday-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="optional">Optional / Floating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-desc">Description</Label>
              <Input
                id="holiday-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional notes or observance info"
              />
            </div>

            <DialogFooter>
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
    </div>
  );
}
