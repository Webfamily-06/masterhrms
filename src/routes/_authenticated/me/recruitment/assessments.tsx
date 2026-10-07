import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileCheck, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/assessments")({
  component: MeAssessmentsPage,
});

export default function MeAssessmentsPage() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["me-assessments"],
    queryFn: async () => {
      const res = await api.get<any[]>("/me/recruitment/assessments");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Candidate Assessments & Technical Reviews"
        description="Review candidate coding submissions and objective test scores assigned to your evaluation queue."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assigned Candidate Assessments</CardTitle>
          <CardDescription>Automated and manual skill evaluations for active applicants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Assessment Test</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No candidate assessments in your review queue.
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.candidate?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{item.candidate?.email}</div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.template?.title || "Technical Assessment"}
                    </TableCell>
                    <TableCell>
                      {item.score !== null ? (
                        <span className="font-semibold">{item.score} / {item.maxScore || 100}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not submitted</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.isPassed !== null ? (
                        <Badge className={item.isPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                          {item.isPassed ? "PASSED" : "FAILED"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
