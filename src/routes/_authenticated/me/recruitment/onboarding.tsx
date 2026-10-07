import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CheckSquare, CheckCircle2, Clock, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/onboarding")({
  component: MeOnboardingPage,
});

export default function MeOnboardingPage() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["me-onboarding-tasks"],
    queryFn: async () => {
      const res = await api.get<any[]>("/me/recruitment/onboarding");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await api.post(`/hr/recruitment/candidate-onboarding/tasks/${taskId}`, { status: "verified" });
    },
    onSuccess: () => {
      toast.success("Task marked as completed");
      queryClient.invalidateQueries({ queryKey: ["me-onboarding-tasks"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Onboarding & Buddy Responsibilities"
        description="Assigned pre-boarding checklist actions for incoming new team members."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assigned Onboarding Action Items</CardTitle>
          <CardDescription>Support incoming joiners with paperwork, equipment, or mentorship.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incoming Joiner</TableHead>
                <TableHead>Task Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    You have no outstanding onboarding action items.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="font-semibold">{task.onboarding?.candidate?.fullName || "Candidate"}</div>
                      <div className="text-xs text-muted-foreground">
                        Joining: {task.onboarding?.joiningDate ? new Date(task.onboarding.joiningDate).toLocaleDateString() : "--"}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.category || "General"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.status === "verified" ? "default" : "secondary"}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {task.status !== "verified" && (
                        <Button
                          size="sm"
                          onClick={() => markCompleteMutation.mutate(task.id)}
                          className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark Done
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
