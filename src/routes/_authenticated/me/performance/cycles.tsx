import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle2, Clock, Target, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/performance/cycles")({
  component: MePerformanceCyclesPage,
  head: () => ({
    meta: [{ title: "Appraisal Cycles & Deadlines — Master HRMS" }],
  }),
});

export default function MePerformanceCyclesPage() {
  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["me-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/performance/cycles");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const activeCycles = cycles.filter((c: any) => c.status === "active" || c.status === "in_review");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appraisal Cycles & Schedule"
        description="View corporate performance review windows, self-assessment deadlines, and manager evaluation schedules."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Active Cycles"
          value={activeCycles.length}
          description="Open for employee review"
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Total Cycles"
          value={cycles.length}
          description="Historical review periods"
          icon={<Target className="h-5 w-5 text-emerald-500" />}
        />
      </StatsOverviewGrid>

      <Card>
        <CardHeader>
          <CardTitle>Performance Review Windows</CardTitle>
          <CardDescription>
            Timelines and milestone dates configured for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading review cycles...</div>
          ) : cycles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No review cycles currently configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Self Review Deadline</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle: any) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.title || cycle.name}</TableCell>
                    <TableCell className="capitalize">{cycle.frequency || "Annual"}</TableCell>
                    <TableCell>{cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : "--"}</TableCell>
                    <TableCell>{cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : "--"}</TableCell>
                    <TableCell>{cycle.selfReviewDeadline ? new Date(cycle.selfReviewDeadline).toLocaleDateString() : "--"}</TableCell>
                    <TableCell>
                      <Badge variant={cycle.status === "active" ? "default" : "secondary"} className="capitalize">
                        {cycle.status || "Planned"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
