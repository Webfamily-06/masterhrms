"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Users,
  BarChart2,
  ExternalLink,
  Paperclip,
} from "lucide-react";

interface TrainingProgramDetail {
  id: string;
  name: string;
  title: string;
  category: string;
  trainingType?: { id: string; name: string } | null;
  description: string;
  prerequisites: string;
  durationHours: number;
  cost: number;
  capacity: number;
  status: "draft" | "active" | "completed" | "cancelled";
  isMandatory: boolean;
  allowSelfEnrollment: boolean;
  materialsUrl: string;
  materialsName: string;
  totalSessions: number;
  completedSessions: number;
  totalEmployees: number;
  completedTrainings: number;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Active
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
        Completed
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
      Draft
    </span>
  );
}

export default function TrainingProgramDetailsPage() {
  const { formatCurrency } = useWorkspaceSettings();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programId = params?.id;

  const { data: program, isLoading } = useQuery<TrainingProgramDetail>({
    queryKey: ["hr-training-program-detail", programId],
    enabled: Boolean(programId),
    queryFn: async () => {
      const res = await api.get(`/hr/training/programs/${programId}`);
      return unwrapData<TrainingProgramDetail>(res);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading training program details...
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push("/hr/training/programs")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Training program not found.
        </div>
      </div>
    );
  }

  const sessionPct =
    program.totalSessions > 0
      ? Math.round((program.completedSessions / program.totalSessions) * 100)
      : 0;
  const employeePct =
    program.totalEmployees > 0
      ? Math.round((program.completedTrainings / program.totalEmployees) * 100)
      : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={program.name || program.title}
        description="View the details, sessions, and enrollments for this training program."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/hr/training/programs")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      {/* Top Row: Program Details (8 cols) + Program Info (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Program Details</h2>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Training Type</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {program.trainingType?.name || program.category || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                {program.description || "No description provided."}
              </p>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Prerequisites</div>
              <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                {program.prerequisites || "None"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {program.allowSelfEnrollment && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                  Self-Enrollment
                </span>
              )}
              {program.isMandatory && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  Mandatory Training
                </span>
              )}
            </div>

            {program.materialsUrl && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground mb-1.5">Materials</div>
                <a
                  href={program.materialsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{program.materialsName || "View Attached Material"}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Program Info</h2>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1.5">
                <StatusBadge status={program.status} />
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {program.durationHours} hours
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {formatCurrency(program.cost)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Capacity</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {program.capacity}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5 relative z-10">
            <div className="text-xs font-medium text-muted-foreground">Total Sessions</div>
            <div className="text-2xl font-bold text-foreground">{program.totalSessions}</div>
            <div className="text-xs font-medium text-sky-600">All sessions</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center relative z-10">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5 relative z-10">
            <div className="text-xs font-medium text-muted-foreground">Completed Sessions</div>
            <div className="text-2xl font-bold text-foreground">{program.completedSessions}</div>
            <div className="text-xs font-medium text-emerald-600">
              {sessionPct}% completion rate
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center relative z-10">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5 relative z-10">
            <div className="text-xs font-medium text-muted-foreground">Total Employees</div>
            <div className="text-2xl font-bold text-foreground">{program.totalEmployees}</div>
            <div className="text-xs font-medium text-purple-600">Enrolled employees</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center relative z-10">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5 relative z-10">
            <div className="text-xs font-medium text-muted-foreground">Completed Trainings</div>
            <div className="text-2xl font-bold text-foreground">{program.completedTrainings}</div>
            <div className="text-xs font-medium text-amber-600">
              {employeePct}% completion rate
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center relative z-10">
            <BarChart2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Session Progress & Employee Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground">Session Progress</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Sessions Completed</span>
              <span className="font-semibold text-foreground">
                {program.completedSessions}/{program.totalSessions}
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${sessionPct}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {sessionPct}% of sessions completed
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground">Employee Progress</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Employees Completed</span>
              <span className="font-semibold text-foreground">
                {program.completedTrainings}/{program.totalEmployees}
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${employeePct}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {employeePct}% of employees completed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
