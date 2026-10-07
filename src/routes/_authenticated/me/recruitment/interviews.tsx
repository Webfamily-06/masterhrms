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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Video, Calendar, Clock, Award, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/interviews")({
  component: MeInterviewsPage,
});

export default function MeInterviewsPage() {
  const queryClient = useQueryClient();
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: 4,
    feedback: "",
    recommendation: "YES",
  });

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["me-interviews"],
    queryFn: async () => {
      const res = await api.get<any[]>("/me/recruitment/interviews");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const submitScorecardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(`/hr/recruitment/interviews/${selectedInterview.id}/scorecard`, payload);
    },
    onSuccess: () => {
      toast.success("Interview feedback submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["me-interviews"] });
      setSelectedInterview(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit feedback");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Interview Panels & Evaluations"
        description="Candidate interviews where you are assigned as an interviewer. Access meeting links and submit structured evaluations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assigned Interview Sessions</CardTitle>
          <CardDescription>Review candidate profiles and submit your assessment scorecards.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position / Requisition</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    You have no pending or assigned candidate interviews at this time.
                  </TableCell>
                </TableRow>
              ) : (
                interviews.map((iv: any) => (
                  <TableRow key={iv.id}>
                    <TableCell>
                      <div className="font-semibold">{iv.candidate?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{iv.candidate?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{iv.candidate?.jobPosting?.title || "Requisition"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Round #{iv.roundNumber}: {iv.roundName}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Clock className="inline h-3 w-3 mr-1 text-muted-foreground" />
                      {new Date(iv.scheduledAt).toLocaleString()} ({iv.durationMinutes}m)
                    </TableCell>
                    <TableCell>
                      <Badge variant={iv.status === "completed" ? "default" : "secondary"}>
                        {iv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {iv.meetingLink && (
                        <a
                          href={iv.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-2.5 gap-1"
                        >
                          <Video className="h-3 w-3" /> Join Call
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInterview(iv);
                          setFeedbackData({
                            rating: iv.rating || 4,
                            feedback: iv.feedback || "",
                            recommendation: iv.recommendation || "YES",
                          });
                        }}
                        className="text-xs gap-1"
                      >
                        <Award className="h-3 w-3" /> Submit Feedback
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedInterview} onOpenChange={(open) => !open && setSelectedInterview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Interview Scorecard</DialogTitle>
            <DialogDescription>
              Evaluation for {selectedInterview?.candidate?.fullName} ({selectedInterview?.roundName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Hiring Recommendation *</Label>
              <Select
                value={feedbackData.recommendation}
                onValueChange={(val) => setFeedbackData({ ...feedbackData, recommendation: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRONG_YES">STRONG YES</SelectItem>
                  <SelectItem value="YES">YES</SelectItem>
                  <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                  <SelectItem value="STRONG_NO">STRONG NO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Written Assessment & Observations *</Label>
              <Textarea
                rows={4}
                placeholder="Detailed feedback regarding technical capability, system design, cultural fit..."
                value={feedbackData.feedback}
                onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInterview(null)}>
              Cancel
            </Button>
            <Button
              disabled={!feedbackData.feedback.trim() || submitScorecardMutation.isPending}
              onClick={() => submitScorecardMutation.mutate(feedbackData)}
            >
              {submitScorecardMutation.isPending ? "Submitting..." : "Submit Scorecard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
