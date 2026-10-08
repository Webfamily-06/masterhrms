import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CheckCircle2, Clock, FileCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/interview-rounds")({
  component: MeInterviewRoundsPage,
  head: () => ({
    meta: [{ title: "Interview Rounds & Guidelines — Master HRMS" }],
  }),
});

export default function MeInterviewRoundsPage() {
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["me-interview-rounds"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/recruitment/interview-rounds");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview Rounds & Evaluation Stages"
        description="Review standardized recruitment stages, evaluation rubrics, and interviewer scorecards used across candidate pipelines."
      />

      <Card>
        <CardHeader>
          <CardTitle>Standard Evaluation Stages</CardTitle>
          <CardDescription>
            Pipeline assessment phases and interviewer expectations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading interview rounds...</div>
          ) : rounds.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No interview rounds defined.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage / Round Name</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead>Focus Area</TableHead>
                  <TableHead>Scorecard Template</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((round: any, idx: number) => (
                  <TableRow key={round.id || idx}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      {round.name || round.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Round {round.order || round.sequence || idx + 1}</Badge>
                    </TableCell>
                    <TableCell>{round.type || round.category || "Technical & Behavioral"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {round.scorecardTemplate || "Standard 5-Point Evaluation Form"}
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
