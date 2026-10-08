import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, BookOpen, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/performance/indicators")({
  component: MePerformanceIndicatorsPage,
  head: () => ({
    meta: [{ title: "Competency Indicators & Rubrics — Master HRMS" }],
  }),
});

export default function MePerformanceIndicatorsPage() {
  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["me-performance-indicators"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/performance/indicators");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competency Indicators & Rubrics"
        description="Review performance measurement indicators, grading criteria, and competency expectations for your role."
      />

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Indicators Catalog</CardTitle>
          <CardDescription>
            Core competency areas and standards used during appraisal cycles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading competency indicators...</div>
          ) : indicators.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No competency indicators currently defined.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Scale</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((ind: any) => (
                  <TableRow key={ind.id}>
                    <TableCell className="font-medium">{ind.name || ind.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ind.category?.name || ind.category || "General"}</Badge>
                    </TableCell>
                    <TableCell>{ind.department?.name || "All Departments"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-sm font-medium">1–5 Scale</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {ind.description || "Core performance expectation criteria."}
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
