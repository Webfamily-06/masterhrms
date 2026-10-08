import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { GraduationCap, Award, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/training/trainings")({
  component: MeTrainingsPage,
});

export default function MeTrainingsPage() {
  const queryClient = useQueryClient();

  const { data: myTrainings = [], isLoading } = useQuery({
    queryKey: ["me-training-enrollments"],
    queryFn: async () => {
      const res = await api.get("/me/training/trainings");
      return res.data;
    },
  });

  const progressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const res = await api.patch(`/me/training/trainings/${id}/progress`, {
        progress,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Progress saved");
      queryClient.invalidateQueries({ queryKey: ["me-training-enrollments"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update progress");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Learning & Training"
        description="View your assigned curriculums, complete modules, and download earned certificates."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            My Enrolled Courses ({myTrainings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading your courses...
                  </TableCell>
                </TableRow>
              ) : myTrainings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    You have no active training enrollments. Browse the academy to enroll in courses.
                  </TableCell>
                </TableRow>
              ) : (
                myTrainings.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div>{t.course?.title}</div>
                      <div className="text-xs text-muted-foreground">{t.course?.instructor}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.course?.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{t.progressPercent}%</span>
                        </div>
                        <Progress value={t.progressPercent} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.certificateId ? (
                        <span className="flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600">
                          <Award className="h-3.5 w-3.5" />
                          {t.certificateId}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            progressMutation.mutate({
                              id: t.id,
                              progress: Math.min(100, (t.progressPercent || 0) + 25),
                            })
                          }
                          className="gap-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Continue
                        </Button>
                      )}
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
