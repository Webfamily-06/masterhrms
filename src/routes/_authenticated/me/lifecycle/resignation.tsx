import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Calendar, AlertTriangle, Undo2, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/resignation")({
  component: MeResignationPage,
});

export default function MeResignationPage() {
  const queryClient = useQueryClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");

  const defaultLastDay = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    noticeDate: new Date().toISOString().split("T")[0],
    intendedLastWorkingDay: defaultLastDay,
    reason: "",
  });

  const { data: resignation, isLoading } = useQuery({
    queryKey: ["me-lifecycle-resignation"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/resignation");
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/me/lifecycle/resignation", data);
    },
    onSuccess: () => {
      toast.success("Resignation notice submitted to Management and HR");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-resignation"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit resignation notice");
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/me/lifecycle/resignation/${id}/withdraw`, { reason });
    },
    onSuccess: () => {
      toast.success("Resignation successfully withdrawn");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-resignation"] });
      setIsWithdrawOpen(false);
      setWithdrawReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to withdraw resignation");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Official Resignation & Notice Period"
        description="Formal self-service portal to submit formal resignation, calculate mandatory notice periods, or revoke active notices."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Checking resignation status...</div>
      ) : resignation ? (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Active Resignation Notice</CardTitle>
                  <CardDescription>
                    Submitted on {new Date(resignation.noticeDate).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={
                  resignation.status === "approved"
                    ? "default"
                    : resignation.status === "pending"
                    ? "outline"
                    : "secondary"
                }
                className="text-xs uppercase"
              >
                {resignation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Notice Submission Date:</span>
                <span className="font-medium">
                  {new Date(resignation.noticeDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Intended Last Working Day:</span>
                <span className="font-medium text-amber-600">
                  {new Date(resignation.intendedLastWorkingDay).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Stated Reason:</span>
              <p className="text-sm p-3 bg-muted/30 rounded border border-border">
                {resignation.reason}
              </p>
            </div>

            {resignation.status === "pending" && (
              <div className="pt-3 border-t border-border flex justify-end">
                <Button
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setIsWithdrawOpen(true)}
                >
                  <Undo2 className="h-4 w-4 mr-2" /> Withdraw Resignation Notice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submit Formal Notice</CardTitle>
            <CardDescription>
              Please note: Submitting a formal resignation notifies your reporting manager and HR.
              Ensure you review your contractual notice period requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Notice Submission Date</Label>
                <Input
                  type="date"
                  value={formData.noticeDate}
                  onChange={(e) => setFormData({ ...formData, noticeDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Intended Last Working Day (LWD)</Label>
                <Input
                  type="date"
                  value={formData.intendedLastWorkingDay}
                  onChange={(e) =>
                    setFormData({ ...formData, intendedLastWorkingDay: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Reason for Resignation</Label>
              <Textarea
                rows={4}
                placeholder="State your reasons and any transition notes for handoff..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="destructive"
                disabled={submitMutation.isPending || !formData.reason}
                onClick={() => submitMutation.mutate(formData)}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Formal Notice"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WITHDRAW MODAL */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Resignation Notice</DialogTitle>
            <DialogDescription>
              Provide a rationale for withdrawing your resignation request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Withdrawal Reason</Label>
              <Textarea
                placeholder="Explain the reasons for continuing your journey with us..."
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={withdrawMutation.isPending}
              onClick={() => {
                if (resignation) {
                  withdrawMutation.mutate({
                    id: resignation.id,
                    reason: withdrawReason,
                  });
                }
              }}
            >
              {withdrawMutation.isPending ? "Withdrawing..." : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
