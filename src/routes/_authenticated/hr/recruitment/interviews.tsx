import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Users,
  FileText,
  Star,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/interviews")({
  component: HrInterviewsPage,
});

export default function HrInterviewsPage() {
  const queryClient = useQueryClient();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scorecardInterview, setScorecardInterview] = useState<any>(null);

  // Scheduling state
  const [scheduleData, setScheduleData] = useState({
    candidateId: "",
    jobCandidateId: "",
    roundNumber: 1,
    roundName: "Technical Round 1",
    scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    durationMinutes: 45,
    interviewerEmployeeId: "",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    notes: "",
  });

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Scorecard state
  const [scorecardData, setScorecardData] = useState({
    rating: 4,
    feedback: "",
    recommendation: "YES",
    technicalSkills: 4,
    communication: 4,
    problemSolving: 4,
    culturalFit: 5,
  });

  // Queries
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["hr-interviews"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; interviews?: any[] }>("/hr/recruitment/interviews");
      return Array.isArray(res) ? res : res.data || res.interviews || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; candidates?: any[] }>("/hr/recruitment/candidates");
      return Array.isArray(res) ? res : res.data || res.candidates || [];
    },
  });

  // Conflict Check
  const checkConflict = async () => {
    try {
      const res = await api.post<any>("/hr/recruitment/interviews/conflict-check", {
        interviewerEmployeeId: scheduleData.interviewerEmployeeId || undefined,
        candidateId: scheduleData.candidateId || scheduleData.jobCandidateId,
        scheduledAt: scheduleData.scheduledAt,
        durationMinutes: Number(scheduleData.durationMinutes),
      });
      if (res.hasConflict) {
        setConflictWarning(res.reason || "Double booking conflict detected!");
      } else {
        setConflictWarning(null);
        toast.success("Calendar slot is free with no conflicting interviews.");
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Schedule Mutation
  const scheduleMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/interviews", {
        jobCandidateId: payload.candidateId,
        roundNumber: Number(payload.roundNumber),
        roundName: payload.roundName,
        scheduledAt: payload.scheduledAt,
        durationMinutes: Number(payload.durationMinutes),
        interviewerEmployeeId: payload.interviewerEmployeeId || undefined,
        meetingLink: payload.meetingLink,
      });
    },
    onSuccess: () => {
      toast.success("Interview scheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-interviews"] });
      setIsScheduleOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule interview");
    },
  });

  // Scorecard Mutation
  const scorecardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(`/hr/recruitment/interviews/${scorecardInterview.id}/scorecard`, {
        rating: payload.rating,
        feedback: payload.feedback,
        recommendation: payload.recommendation,
        criteriaRatings: {
          technicalSkills: payload.technicalSkills,
          communication: payload.communication,
          problemSolving: payload.problemSolving,
          culturalFit: payload.culturalFit,
        },
      });
    },
    onSuccess: () => {
      toast.success("Scorecard and feedback submitted");
      queryClient.invalidateQueries({ queryKey: ["hr-interviews"] });
      setScorecardInterview(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save scorecard");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Interview Management & Scorecards"
          description="Structured panel interviews with automated calendar conflict prevention and 5-point evaluation scorecards."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsScheduleOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Schedule Interview
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled"
          value={interviews.length.toString()}
          description="All interview sessions"
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Upcoming Today"
          value={interviews.filter((i: any) => i.status === "scheduled").length.toString()}
          description="Confirmed slots"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Completed"
          value={interviews.filter((i: any) => i.status === "completed").length.toString()}
          description="Feedback submitted"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Pending Evaluation"
          value={interviews.filter((i: any) => i.status === "scheduled" && !i.feedback).length.toString()}
          description="Awaiting panel scorecards"
          icon={<FileText className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Interviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Calendar & Rounds</CardTitle>
          <CardDescription>
            View panel members, join links, status, and submit interviewer scorecards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No interviews scheduled yet.
                  </TableCell>
                </TableRow>
              ) : (
                interviews.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.candidate?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{item.candidate?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">Round #{item.roundNumber}: {item.roundName}</div>
                      <div className="text-xs text-muted-foreground">{item.durationMinutes} minutes</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(item.scheduledAt).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.recommendation ? (
                        <Badge
                          className={
                            item.recommendation.includes("YES")
                              ? "bg-emerald-500/10 text-emerald-600"
                              : item.recommendation.includes("NO")
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {item.recommendation}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "completed" ? "default" : "outline"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-2.5 gap-1"
                        >
                          <Video className="h-3 w-3" /> Join
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setScorecardInterview(item);
                          setScorecardData({
                            rating: item.rating || 4,
                            feedback: item.feedback || "",
                            recommendation: item.recommendation || "YES",
                            technicalSkills: 4,
                            communication: 4,
                            problemSolving: 4,
                            culturalFit: 4,
                          });
                        }}
                        className="gap-1 text-xs"
                      >
                        <Award className="h-3 w-3" /> Scorecard
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Interview Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview Round</DialogTitle>
            <DialogDescription>
              Check for interviewer and candidate schedule conflicts before booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Candidate *</Label>
              <Select
                value={scheduleData.candidateId}
                onValueChange={(val) => setScheduleData({ ...scheduleData, candidateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Round Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={scheduleData.roundNumber}
                  onChange={(e) => setScheduleData({ ...scheduleData, roundNumber: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Duration (Mins)</Label>
                <Input
                  type="number"
                  value={scheduleData.durationMinutes}
                  onChange={(e) => setScheduleData({ ...scheduleData, durationMinutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Round Name</Label>
              <Input
                value={scheduleData.roundName}
                onChange={(e) => setScheduleData({ ...scheduleData, roundName: e.target.value })}
              />
            </div>

            <div>
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={scheduleData.scheduledAt}
                onChange={(e) => setScheduleData({ ...scheduleData, scheduledAt: e.target.value })}
              />
            </div>

            <div>
              <Label>Meeting Link</Label>
              <Input
                value={scheduleData.meetingLink}
                onChange={(e) => setScheduleData({ ...scheduleData, meetingLink: e.target.value })}
              />
            </div>

            {/* Conflict Check Button & Warning */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkConflict}
                className="w-full gap-1 text-xs"
              >
                <Calendar className="h-3 w-3" /> Run Conflict Check
              </Button>
              {conflictWarning && (
                <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{conflictWarning}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!scheduleData.candidateId || scheduleMutation.isPending}
              onClick={() => scheduleMutation.mutate(scheduleData)}
            >
              {scheduleMutation.isPending ? "Booking..." : "Schedule Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scorecard Dialog */}
      <Dialog open={!!scorecardInterview} onOpenChange={(open) => !open && setScorecardInterview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Interviewer Scorecard & Evaluation</DialogTitle>
            <DialogDescription>
              Submit feedback for {scorecardInterview?.candidate?.fullName} - {scorecardInterview?.roundName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div>
              <Label>Recommendation Scale (Mandatory) *</Label>
              <Select
                value={scorecardData.recommendation}
                onValueChange={(val) => setScorecardData({ ...scorecardData, recommendation: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRONG_YES">STRONG YES (Exceptional Hire)</SelectItem>
                  <SelectItem value="YES">YES (Meets Bar / Recommend)</SelectItem>
                  <SelectItem value="NEUTRAL">NEUTRAL (Borderline / More Data)</SelectItem>
                  <SelectItem value="NO">NO (Below Bar)</SelectItem>
                  <SelectItem value="STRONG_NO">STRONG NO (Definite Reject)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Technical Competence (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={scorecardData.technicalSkills}
                  onChange={(e) => setScorecardData({ ...scorecardData, technicalSkills: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Communication (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={scorecardData.communication}
                  onChange={(e) => setScorecardData({ ...scorecardData, communication: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Detailed Written Evaluation *</Label>
              <Textarea
                rows={4}
                placeholder="Specific observations, coding problem results, problem-solving reasoning..."
                value={scorecardData.feedback}
                onChange={(e) => setScorecardData({ ...scorecardData, feedback: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScorecardInterview(null)}>
              Cancel
            </Button>
            <Button
              disabled={!scorecardData.feedback.trim() || scorecardMutation.isPending}
              onClick={() => scorecardMutation.mutate(scorecardData)}
            >
              {scorecardMutation.isPending ? "Submitting..." : "Submit Scorecard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
