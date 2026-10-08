import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, CheckCircle2, Clock, Calendar, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/performance/goals")({
  component: MeGoalsPage,
});

export default function MeGoalsPage() {
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [note, setNote] = useState("");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["me-performance-goals"],
    queryFn: async () => {
      const res = await api.get("/me/performance/goals");
      return res.data;
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ goalId, val, note }: { goalId: string; val: number; note: string }) => {
      return await api.post("/me/performance/goals/checkin", {
        goalId,
        currentValue: val,
        note,
      });
    },
    onSuccess: () => {
      toast.success("Goal progress updated successfully");
      queryClient.invalidateQueries({ queryKey: ["me-performance-goals"] });
      setIsCheckinOpen(false);
      setSelectedGoal(null);
      setCurrentValue("");
      setNote("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update progress");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Goals & Key Results (OKRs)"
        description="Track your assigned objectives, log measurable milestone check-ins, and monitor overall goal completion."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading your goals...</div>
      ) : goals.length === 0 ? (
        <Card className="py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Goals Assigned Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your manager or HR will assign performance goals for the current review cycle.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal: any) => {
            const percent = Math.min(100, Math.round(Number(goal.progressPercent || 0)));
            return (
              <Card key={goal.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {goal.goalType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {goal.weight}% Weight
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold">{goal.title}</CardTitle>
                    </div>

                    <Badge
                      variant={
                        goal.status === "completed"
                          ? "default"
                          : goal.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {goal.status?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  {goal.description && (
                    <CardDescription className="line-clamp-2 mt-2">
                      {goal.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">Completion Progress</span>
                      <span className="font-mono text-muted-foreground">
                        {goal.currentValue ?? 0} / {goal.targetValue} {goal.unit || "%"} ({percent}%)
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Due:{" "}
                      {new Date(goal.dueDate).toLocaleDateString()}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setCurrentValue((goal.currentValue ?? 0).toString());
                        setIsCheckinOpen(true);
                      }}
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" /> Check-in Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CHECK-IN MODAL */}
      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Goal Progress Check-in</DialogTitle>
            <DialogDescription>
              Update your achieved metric for: {selectedGoal?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Current Value (Target: {selectedGoal?.targetValue} {selectedGoal?.unit})</Label>
              <Input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </div>
            <div>
              <Label>Check-in Note / Evidence</Label>
              <Input
                placeholder="Brief update on what was completed..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckinOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={checkinMutation.isPending || currentValue === ""}
              onClick={() => {
                if (selectedGoal) {
                  checkinMutation.mutate({
                    goalId: selectedGoal.id,
                    val: parseFloat(currentValue) || 0,
                    note,
                  });
                }
              }}
            >
              {checkinMutation.isPending ? "Updating..." : "Update Progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
