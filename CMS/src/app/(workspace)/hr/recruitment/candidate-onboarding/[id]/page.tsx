"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function ViewCandidateOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["hr-candidate-onboarding-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/candidate-onboarding/${id}`);
      return res?.data || res;
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      const next = task.status === "completed" ? "pending" : "completed";
      return await api.put(`/hr/recruitment/candidate-onboarding/${id}/tasks/${task.id}`, { status: next });
    },
    onSuccess: () => {
      toast.success("Task progress updated");
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-onboarding-detail", id] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update task"),
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-44 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-80 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Onboarding record not found</p>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/candidate-onboarding")}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const buddyName = onboarding.buddy
    ? [onboarding.buddy.firstName, onboarding.buddy.lastName].filter(Boolean).join(" ") ||
      onboarding.buddy.email
    : "Unassigned";

  const statusRaw = String(onboarding.status || "pending").toLowerCase();
  const statusLabel =
    statusRaw === "completed"
      ? "Completed"
      : statusRaw === "in_progress" || statusRaw === "inprogress"
        ? "In Progress"
        : "Pending";

  const tasks: any[] =
    Array.isArray(onboarding.tasks) && onboarding.tasks.length > 0
      ? onboarding.tasks
      : Array.isArray(onboarding.template?.items)
        ? onboarding.template.items
        : [];

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Onboarding Details</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View the onboarding checklist and progress for this candidate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/hr/recruitment/candidate-onboarding")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 self-start sm:self-auto"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-border/80 bg-card/50 p-5 space-y-5">
        {/* Employee Information */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
            <div>
              <p className="text-muted-foreground">Employee Name</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {onboarding.candidate?.fullName || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {onboarding.candidate?.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Buddy Employee</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{buddyName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatDate(onboarding.joiningDate)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${
                    statusLabel === "Completed"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : statusLabel === "In Progress"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Checklist */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Onboarding Checklist</h2>
            <p className="text-sm font-semibold text-foreground mt-2">
              {onboarding.template?.name || "Standard Employee Onboarding"}
            </p>
            {onboarding.template?.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {onboarding.template.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">
                No checklist tasks assigned to this onboarding yet.
              </p>
            ) : (
              tasks.map((task: any, idx: number) => {
                const isDone = task.status === "completed" || task.status === "verified";
                const isOnboardingTask = Boolean(task.onboardingId);
                return (
                  <div
                    key={task.id || idx}
                    className="rounded-xl border border-border/80 bg-background p-4 flex items-start justify-between gap-4 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        }`}
                      >
                        {isDone ? <i className="ph-bold ph-check text-[11px]" /> : idx + 1}
                      </span>
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-bold ${
                            isDone ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Due Day: {task.dueOffsetDays || idx + 1}
                        </p>
                      </div>
                    </div>
                    {isOnboardingTask && (
                      <button
                        type="button"
                        onClick={() => toggleTaskMutation.mutate(task)}
                        className={`shrink-0 h-7 px-2.5 rounded-md border text-[11px] font-semibold transition-colors ${
                          isDone
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isDone ? "Done" : "Mark Done"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
