"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ArrowLeft, Download, FileCheck2 } from "lucide-react";

interface AssessmentResult {
  id: string;
  assessmentName: string;
  score: number;
  passed: boolean;
  result: string;
  feedback: string;
  assessmentDate: string;
}

interface TrainingDetailData {
  id: string;
  employeeId: string;
  courseId: string;
  status: "assigned" | "in_progress" | "completed" | "failed";
  assignedDate: string;
  completionDate: string;
  assignedByName: string;
  score: number | null;
  result: string | null;
  feedback: string;
  notes: string;
  certificationUrl: string;
  certificationName: string;
  assessments: AssessmentResult[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    departmentName?: string;
    designationName?: string;
    email?: string;
    phone?: string;
  } | null;
  course?: {
    id: string;
    title: string;
    trainingTypeName?: string;
    durationHours: number;
    cost: number;
    status: string;
    description: string;
    prerequisites: string;
    isMandatory: boolean;
    allowSelfEnrollment: boolean;
    materialsUrl: string;
    materialsName: string;
  } | null;
}

const ASSESSMENT_OPTIONS = [
  "Pre-Training Assessment",
  "Module Quiz",
  "Practical Evaluation",
  "Final Assessment",
  "Certification Exam",
];

function StatusBadge({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
        In Progress
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 border border-sky-500/20">
      Assigned
    </span>
  );
}

export default function EmployeeTrainingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const enrollmentId = params?.id;

  const [activeTab, setActiveTab] = useState<"program" | "assessments">("program");
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    assessmentName: "",
    score: "",
    feedback: "",
    assessmentDate: new Date().toISOString().split("T")[0],
    updateTrainingStatus: true,
  });

  const { data: training, isLoading } = useQuery<TrainingDetailData>({
    queryKey: ["hr-employee-training-detail", enrollmentId],
    enabled: Boolean(enrollmentId),
    queryFn: async () => {
      const res = await api.get(`/hr/training/employee-trainings/${enrollmentId}`);
      return unwrapData<TrainingDetailData>(res);
    },
  });

  const recordAssessmentMutation = useMutation({
    mutationFn: async () =>
      api.post(`/hr/training/employee-trainings/${enrollmentId}/assessments`, {
        ...assessmentForm,
        score: Number(assessmentForm.score),
      }),
    onSuccess: () => {
      toast.success("Assessment result recorded");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-training-detail", enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
      setAssessmentOpen(false);
      setAssessmentForm({
        assessmentName: "",
        score: "",
        feedback: "",
        assessmentDate: new Date().toISOString().split("T")[0],
        updateTrainingStatus: true,
      });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to record assessment"),
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading training details...
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push("/hr/training/employee-trainings")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Training assignment not found.
        </div>
      </div>
    );
  }

  const empName = training.employee
    ? `${training.employee.firstName || ""} ${training.employee.lastName || ""}`.trim()
    : "—";

  const handleAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentForm.assessmentName) return toast.error("Please select an assessment");
    if (assessmentForm.score === "") return toast.error("Please enter a score (%)");
    recordAssessmentMutation.mutate();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Training Details"
        description="View the details and progress of this employee training."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/hr/training/employee-trainings")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button
              onClick={() => setAssessmentOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <FileCheck2 className="h-4 w-4 mr-1.5" />
              Record Assessment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Training Summary Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {training.course?.title || "—"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {training.course?.trainingTypeName || "—"}
                </p>
              </div>
              <StatusBadge status={training.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Employee</div>
                <div className="text-sm font-semibold text-foreground mt-1">{empName}</div>
                {training.employee?.employeeCode && (
                  <div className="text-xs text-muted-foreground">
                    {training.employee.employeeCode}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Assigned By</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {training.assignedByName || "HR Admin"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Assigned Date</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {training.assignedDate || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Completion Date</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {training.completionDate || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {training.score !== null && training.score !== undefined
                    ? `${Number(training.score).toFixed(2)}%`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Result</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {training.result || "-"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Notes</div>
              <p className="text-sm text-foreground mt-1 leading-relaxed">
                {training.notes || "No notes recorded."}
              </p>
            </div>

            {training.certificationUrl && (
              <div>
                <a
                  href={training.certificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border/80 bg-background hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Certification
                </a>
              </div>
            )}
          </div>

          {/* 2-Tab Switcher */}
          <div className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl border border-border/70">
            <button
              type="button"
              onClick={() => setActiveTab("program")}
              className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === "program"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Program Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assessments")}
              className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === "assessments"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Assessment Results
            </button>
          </div>

          {/* Tab Panel */}
          {activeTab === "program" ? (
            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
              <h3 className="text-base font-bold text-foreground">Program Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {training.course?.durationHours ?? 0} Hours
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    ${Number(training.course?.cost || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 capitalize">
                      {training.course?.status || "Active"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Flags</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {training.course?.isMandatory && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
                        Mandatory
                      </span>
                    )}
                    {training.course?.allowSelfEnrollment && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 border border-sky-500/20">
                        Self-Enrollment
                      </span>
                    )}
                    {!training.course?.isMandatory && !training.course?.allowSelfEnrollment && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">
                  {training.course?.description || "No description provided."}
                </p>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Prerequisites</div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">
                  {training.course?.prerequisites || "None"}
                </p>
              </div>

              {training.course?.materialsUrl && (
                <div>
                  <a
                    href={training.course.materialsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border/80 bg-background hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Materials
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
              <h3 className="text-base font-bold text-foreground">Assessment Results</h3>

              {training.assessments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No assessment results available
                </div>
              ) : (
                <div className="space-y-3">
                  {training.assessments.map((asm) => (
                    <div
                      key={asm.id}
                      className="p-4 rounded-xl border border-border/80 bg-background/50 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">
                          {asm.assessmentName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Date: {asm.assessmentDate}
                        </div>
                        {asm.feedback && (
                          <p className="text-sm text-foreground pt-1">{asm.feedback}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-base font-bold text-foreground">
                          {Number(asm.score).toFixed(2)}%
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            asm.passed
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                          }`}
                        >
                          {asm.result || (asm.passed ? "Passed" : "Failed")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Button
                  onClick={() => setAssessmentOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <FileCheck2 className="h-4 w-4 mr-1.5" />
                  Record Assessment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Employee Details */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Employee Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{empName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Employee ID</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {training.employee?.employeeCode || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Department</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {training.employee?.departmentName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Designation</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {training.employee?.designationName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-semibold text-foreground mt-0.5 break-all">
                {training.employee?.email || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {training.employee?.phone || "—"}
              </div>
            </div>
          </div>

          {training.employeeId && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push(`/hr/employees/${training.employeeId}`)}
            >
              View Employee Profile
            </Button>
          )}
        </div>
      </div>

      {/* Record Assessment Result Modal */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Assessment Result</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssessmentSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Assessment <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={assessmentForm.assessmentName}
                onValueChange={(val) =>
                  setAssessmentForm((p) => ({ ...p, assessmentName: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Assessment" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Score (%) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={assessmentForm.score}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, score: e.target.value }))}
                placeholder="e.g. 85.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea
                rows={3}
                value={assessmentForm.feedback}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, feedback: e.target.value }))}
                placeholder="e.g. Good performance overall..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Assessment Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assessmentForm.assessmentDate}
                onChange={(e) =>
                  setAssessmentForm((p) => ({ ...p, assessmentDate: e.target.value }))
                }
                required
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={assessmentForm.updateTrainingStatus}
                onChange={(e) =>
                  setAssessmentForm((p) => ({ ...p, updateTrainingStatus: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm font-semibold text-foreground">Update Training Status</span>
            </label>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAssessmentOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordAssessmentMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {recordAssessmentMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
