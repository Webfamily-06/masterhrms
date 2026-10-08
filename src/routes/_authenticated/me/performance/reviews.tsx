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
import { Award, Star, CheckCircle2, Clock, Lock, FileCheck, Edit3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/performance/reviews")({
  component: MeReviewsPage,
});

export default function MeReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isSelfReviewOpen, setIsSelfReviewOpen] = useState(false);
  const [isAckOpen, setIsAckOpen] = useState(false);

  const [selfScore, setSelfScore] = useState("4.0");
  const [selfFeedback, setSelfFeedback] = useState("");
  const [ackNotes, setAckNotes] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["me-performance-reviews"],
    queryFn: async () => {
      const res = await api.get("/me/performance/reviews");
      return res.data;
    },
  });

  const selfMutation = useMutation({
    mutationFn: async ({ reviewId, score, feedback }: { reviewId: string; score: number; feedback: string }) => {
      return await api.post("/me/performance/reviews/self", {
        reviewId,
        selfScore: score,
        selfFeedback: feedback,
      });
    },
    onSuccess: () => {
      toast.success("Self-assessment submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["me-performance-reviews"] });
      setIsSelfReviewOpen(false);
      setSelectedReview(null);
      setSelfFeedback("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit self-assessment");
    },
  });

  const ackMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await api.put(`/me/performance/reviews/${id}/acknowledge`, {
        acknowledgementNotes: notes,
      });
    },
    onSuccess: () => {
      toast.success("Performance appraisal acknowledged");
      queryClient.invalidateQueries({ queryKey: ["me-performance-reviews"] });
      setIsAckOpen(false);
      setSelectedReview(null);
      setAckNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to acknowledge appraisal");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Appraisals & Evaluations"
        description="Submit your self-evaluations, review calibrated performance ratings once released by HR, and provide digital sign-offs."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading performance appraisals...</div>
      ) : reviews.length === 0 ? (
        <Card className="py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Performance Appraisals Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            When HR launches a performance cycle for your cohort, evaluations will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reviews.map((r: any) => {
            const hasSelfScore = !!r.selfScore;
            const isReleased = r.isReleased === true;

            return (
              <Card key={r.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">
                          {r.cycle?.title || "Annual Performance Review"}
                        </CardTitle>
                        <Badge
                          variant={
                            r.status === "finalized"
                              ? "default"
                              : r.status === "submitted"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        Reviewer: {r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "Reporting Manager / HR"}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasSelfScore && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReview(r);
                            setIsSelfReviewOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-1" /> Complete Self-Assessment
                        </Button>
                      )}

                      {isReleased && !r.acknowledgedAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReview(r);
                            setIsAckOpen(true);
                          }}
                        >
                          <FileCheck className="h-4 w-4 mr-1" /> Acknowledge Appraisal
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* SCORES SUMMARY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SELF ASSESSMENT BOX */}
                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          Self Assessment
                        </span>
                        {hasSelfScore ? (
                          <Badge variant="secondary" className="font-mono">
                            {Number(r.selfScore).toFixed(1)} / 5.0
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">Pending Input</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.selfFeedback || "No self-assessment notes submitted yet."}
                      </p>
                    </div>

                    {/* OFFICIAL APPRAISAL RATING BOX */}
                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          Official Calibrated Rating
                        </span>
                        {isReleased ? (
                          <div className="flex items-center gap-1 text-amber-500 font-mono font-bold">
                            <Star className="h-4 w-4 fill-current" />
                            <span>{Number(r.overallScore || 0).toFixed(1)} / 5.0</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" /> In Calibration
                          </Badge>
                        )}
                      </div>

                      {isReleased ? (
                        <p className="text-xs text-muted-foreground">
                          {r.remarks || "Performance rating finalized and approved."}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Manager evaluation is being finalized. Ratings will be published upon HR cycle release.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* RELEASED FEEDBACK DETAILS */}
                  {isReleased && (
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
                      {r.strengths && (
                        <div>
                          <span className="text-xs font-semibold text-emerald-600 block">
                            Key Strengths:
                          </span>
                          <p className="text-xs text-muted-foreground">{r.strengths}</p>
                        </div>
                      )}
                      {r.areasOfImprovement && (
                        <div>
                          <span className="text-xs font-semibold text-amber-600 block">
                            Development Areas:
                          </span>
                          <p className="text-xs text-muted-foreground">{r.areasOfImprovement}</p>
                        </div>
                      )}
                      {r.acknowledgedAt && (
                        <div className="pt-2 border-t border-border flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged by you on{" "}
                          {new Date(r.acknowledgedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* SELF-ASSESSMENT MODAL */}
      <Dialog open={isSelfReviewOpen} onOpenChange={setIsSelfReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Self-Assessment</DialogTitle>
            <DialogDescription>
              Evaluate your performance for cycle: {selectedReview?.cycle?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Self Rating (1.0 to 5.0 Stars)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={selfScore}
                onChange={(e) => setSelfScore(e.target.value)}
              />
            </div>
            <div>
              <Label>Achievements & Self Reflection</Label>
              <Textarea
                rows={5}
                placeholder="Highlight your key deliverables, leadership initiatives, and learnings..."
                value={selfFeedback}
                onChange={(e) => setSelfFeedback(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelfReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={selfMutation.isPending || !selfScore || !selfFeedback}
              onClick={() => {
                if (selectedReview) {
                  selfMutation.mutate({
                    reviewId: selectedReview.id,
                    score: parseFloat(selfScore) || 0,
                    feedback: selfFeedback,
                  });
                }
              }}
            >
              {selfMutation.isPending ? "Submitting..." : "Submit Self-Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACKNOWLEDGE MODAL */}
      <Dialog open={isAckOpen} onOpenChange={setIsAckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge Performance Appraisal</DialogTitle>
            <DialogDescription>
              Confirm receipt and discussion of your performance review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee Comments / Acknowledgement Notes (Optional)</Label>
              <Textarea
                placeholder="Optional comments regarding the appraisal discussion..."
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAckOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={ackMutation.isPending}
              onClick={() => {
                if (selectedReview) {
                  ackMutation.mutate({
                    id: selectedReview.id,
                    notes: ackNotes,
                  });
                }
              }}
            >
              {ackMutation.isPending ? "Signing..." : "Sign Acknowledgement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
