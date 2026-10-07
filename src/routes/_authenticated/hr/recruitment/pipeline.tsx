import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Users,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  XCircle,
  Briefcase,
  AlertCircle,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/pipeline")({
  component: HrRecruitmentPipelinePage,
});

const PIPELINE_COLUMNS = [
  { id: "applied", label: "Applied", color: "border-blue-400 bg-blue-50/20" },
  { id: "screening", label: "Screening", color: "border-amber-400 bg-amber-50/20" },
  { id: "assessment", label: "Assessment", color: "border-purple-400 bg-purple-50/20" },
  { id: "interview", label: "Interview", color: "border-indigo-400 bg-indigo-50/20" },
  { id: "offer", label: "Offer Extended", color: "border-emerald-400 bg-emerald-50/20" },
  { id: "hired", label: "Hired", color: "border-green-600 bg-green-50/20" },
];

export default function HrRecruitmentPipelinePage() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [rejectDialogCandidate, setRejectDialogCandidate] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["hr-pipeline-candidates", selectedJobId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; candidates?: any[] }>(
        `/hr/recruitment/candidates${selectedJobId !== "all" ? `?jobPostingId=${selectedJobId}` : ""}`
      );
      return Array.isArray(res) ? res : res.data || res.candidates || [];
    },
  });

  const { data: jobList = [] } = useQuery({
    queryKey: ["hr-job-postings"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; jobs?: any[] }>("/hr/recruitment/job-postings");
      return Array.isArray(res) ? res : res.data || res.jobs || [];
    },
  });

  // Stage transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, stage, reason }: { id: string; stage: string; reason?: string }) => {
      return await api.post(`/hr/recruitment/candidates/${id}/stage`, { stage, rejectionReason: reason });
    },
    onSuccess: () => {
      toast.success("Candidate moved to new pipeline stage");
      queryClient.invalidateQueries({ queryKey: ["hr-pipeline-candidates"] });
      setRejectDialogCandidate(null);
      setRejectionReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update pipeline stage");
    },
  });

  const handleStageMove = (cand: any, targetStage: string) => {
    if (targetStage === "rejected") {
      setRejectDialogCandidate(cand);
    } else {
      transitionMutation.mutate({ id: cand.id, stage: targetStage });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Recruitment Kanban Pipeline"
          description="Visual applicant stages with auditable progression, validated stage movement, and mandatory rejection reasoning."
        />
        <div className="flex items-center gap-3">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filter by Job..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requisitions</SelectItem>
              {jobList.map((j: any) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((col) => {
          const colCandidates = candidates.filter((c: any) => (c.stage || "applied") === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border bg-card/60 p-3 shadow-sm min-w-[200px] ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <span className="font-semibold text-sm">{col.label}</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {colCandidates.length}
                </Badge>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 pt-3 overflow-y-auto max-h-[70vh]">
                {colCandidates.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No candidates
                  </div>
                ) : (
                  colCandidates.map((cand: any) => (
                    <Card key={cand.id} className="shadow-xs hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div>
                          <div className="font-semibold text-sm leading-tight">{cand.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">{cand.email}</div>
                        </div>

                        <div className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate">{cand.jobPosting?.title || "Requisition"}</span>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStageMove(cand, "rejected")}
                            className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10"
                          >
                            Reject
                          </Button>

                          {/* Quick advance to next stage */}
                          {col.id === "applied" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStageMove(cand, "screening")}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              Screen <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {col.id === "screening" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStageMove(cand, "assessment")}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              Assess <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {col.id === "assessment" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStageMove(cand, "interview")}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              Interview <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {col.id === "interview" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStageMove(cand, "offer")}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              Offer <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {col.id === "offer" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStageMove(cand, "hired")}
                              className="h-6 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Hire <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Rejection Reason Dialog */}
      <Dialog open={!!rejectDialogCandidate} onOpenChange={(open) => !open && setRejectDialogCandidate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Reject Candidate
            </DialogTitle>
            <DialogDescription>
              Per recruitment compliance policy, rejecting candidate{" "}
              <strong>{rejectDialogCandidate?.fullName}</strong> requires an explicit audit reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Rejection Category / Reason *</Label>
              <Textarea
                placeholder="e.g. Failed technical round 2; compensation misalignment; cultural fit..."
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogCandidate(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  id: rejectDialogCandidate.id,
                  stage: "rejected",
                  reason: rejectionReason,
                })
              }
            >
              {transitionMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
