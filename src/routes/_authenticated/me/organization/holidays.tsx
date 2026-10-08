import { useState } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { CalendarDays, Calendar, Sun, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/organization/holidays")({
  component: MyHolidaysPage,
  head: () => ({
    meta: [{ title: "Company Holidays — Master HRMS" }],
  }),
});

interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
}

const currentYear = new Date().getFullYear();

export function MyHolidaysPage() {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["my-holidays", selectedYear],
    queryFn: async () => {
      const res = await api.get("/me/organization/holidays", {
        params: { year: selectedYear },
      });
      return res.data || res || [];
    },
  });

  const holidays: HolidayRecord[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.data as any) || [];

  const publicCount = holidays.filter((h) => h.type === "public" || h.type === "national").length;
  const optionalCount = holidays.filter((h) => h.type === "optional").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Holidays Schedule"
        description="Official list of national holidays, corporate festivals, and scheduled non-working days."
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
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
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title={`Scheduled Holidays (${selectedYear})`}
          value={holidays.length}
          icon={<CalendarDays className="h-5 w-5" />}
          description="Total company holidays"
        />
        <StatCard
          title="Mandatory Closures"
          value={publicCount}
          icon={<CheckCircle className="h-5 w-5" />}
          description="All-hands public holidays"
        />
        <StatCard
          title="Floating / Optional"
          value={optionalCount}
          icon={<Sun className="h-5 w-5" />}
          description="Eligible optional festivals"
        />
      </StatsOverviewGrid>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holiday Name</TableHead>
              <TableHead>Date & Day</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Loading holidays schedule...
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No holidays listed for {selectedYear}.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => {
                const dateObj = new Date(h.date);
                const isValidDate = !isNaN(dateObj.getTime());
                const formattedDate = isValidDate ? format(dateObj, "dd MMM yyyy") : h.date;
                const dayOfWeek = isValidDate ? format(dateObj, "EEEE") : "—";

                return (
                  <TableRow key={h.id}>
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
