"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { sanitizeHtml } from "@/lib/html-sanitizer";

function formatMoney(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDateOnly(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function formatDateTime(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

function formatType(job: any): string {
  if (job?.type?.name) return job.type.name;
  return String(job?.employmentType || "Full-time")
    .replace(/_/g, "-")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ViewJobPostingPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { data: job, isLoading } = useQuery({
    queryKey: ["hr-job-posting-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/job-postings/${id}`);
      return res?.data || res;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-72 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-80 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <i className="ph ph-briefcase text-3xl text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Job posting not found</p>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/job-postings")}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back to Job Postings
          </button>
        </div>
      </div>
    );
  }

  const deadlineStr = formatDateOnly(job.closingDate);
  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpired = deadlineStr !== "—" && deadlineStr < todayIso;
  const st = String(job.status || "draft").toLowerCase();
  const priority = String(job.priority || "Low");
  const skills: string[] = Array.isArray(job.skills) ? job.skills : [];
  const customQuestions: any[] = Array.isArray(job.customQuestions) ? job.customQuestions : [];

  const experienceText =
    job.minExperience !== undefined || job.maxExperience !== undefined
      ? `${Number(job.minExperience || 0).toFixed(1)} - ${Number(job.maxExperience || 0).toFixed(1)} years`
      : job.experienceLevel || "0.0 - 2.0 years";

  const salaryText =
    job.salaryMin || job.salaryMax
      ? `${formatMoney(job.salaryMin || 0)} - ${formatMoney(job.salaryMax || 0)}`
      : "Not specified";

  const branchDept = [job.branch?.name, job.department?.name].filter(Boolean).join(" • ");

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{job.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View full details, applicants, and activity for this job posting.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/hr/recruitment/job-postings/${job.id}/edit`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
          >
            <i className="ph ph-pencil-simple text-sm" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/job-postings")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-xl border border-border/80 bg-card/50 p-5 space-y-5">
        {/* Summary Banner */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5 shadow-xs">
          <h2 className="text-lg font-bold text-foreground">{job.title}</h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="ph ph-briefcase text-emerald-600 text-sm" />
              {formatType(job)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="ph ph-map-pin text-emerald-600 text-sm" />
              {job.jobLocation?.name || job.location || "Remote"}
            </span>
            {branchDept && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ph ph-buildings text-emerald-600 text-sm" />
                {branchDept}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <i className="ph ph-users text-emerald-600 text-sm" />
              {job.openingsCount || 1} {Number(job.openingsCount || 1) === 1 ? "position" : "positions"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="ph ph-calendar-blank text-emerald-600 text-sm" />
              {deadlineStr}
              {isExpired && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-semibold">
                  Expired
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-5">
            {/* Experience & Compensation */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-clock text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Experience &amp; Compensation</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <i className="ph ph-clock text-lg" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Required Experience</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{experienceText}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="ph ph-currency-dollar text-lg" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Salary Range</p>
                    <p className="text-sm font-bold tabular-nums text-foreground mt-0.5">
                      {salaryText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-file-text text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Job Description</h3>
              </div>
              <div
                className="p-5 text-sm text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(job.description || "<p class='text-muted-foreground'>No description provided.</p>"),
                }}
              />
            </div>

            {/* Requirements */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-check-circle text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Requirements</h3>
              </div>
              <div
                className="p-5 text-sm text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(job.requirements || "<p class='text-muted-foreground'>No requirements specified.</p>"),
                }}
              />
            </div>

            {/* Benefits */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-sparkle text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Benefits</h3>
              </div>
              <div
                className="p-5 text-sm text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(job.benefits || "<p class='text-muted-foreground'>No benefits specified.</p>"),
                }}
              />
            </div>

            {/* Required Skills */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-tag text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Required Skills</h3>
              </div>
              <div className="p-5">
                {skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No specific skills listed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 1 Column */}
          <div className="space-y-5">
            {/* Posting Status & Attributes */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-info text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Posting Status &amp; Attributes</h3>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job Code</span>
                  <span className="px-2 py-0.5 rounded bg-muted font-semibold text-foreground border border-border/70">
                    {job.jobCode || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {st === "published" || st === "open" ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      Published
                    </span>
                  ) : st === "closed" ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 border border-slate-500/20 font-semibold">
                      Closed
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                      Draft
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-semibold border ${
                      priority === "High" || priority === "Urgent"
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : priority === "Medium"
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                          : "bg-sky-500/10 text-sky-700 border-sky-500/20"
                    }`}
                  >
                    {priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Questions */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-question text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Custom Questions</h3>
              </div>
              <div className="p-4 space-y-2.5">
                {customQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">No custom questions configured.</p>
                ) : (
                  customQuestions.map((q: any, idx: number) => (
                    <div
                      key={q.id || idx}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/60"
                    >
                      <span className="text-xs font-medium text-foreground">{q.question}</span>
                      {q.required && (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Important Dates */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-calendar-blank text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Important Dates</h3>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-semibold text-foreground">
                    {formatDateOnly(job.startDate || job.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Application Deadline</span>
                  <span className="font-semibold text-foreground">{deadlineStr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Published Date</span>
                  <span className="font-semibold text-foreground">{formatDateOnly(job.publishedAt)}</span>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
                <i className="ph ph-shield-check text-emerald-600 text-base" />
                <h3 className="text-sm font-bold text-foreground">Audit Log</h3>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created At</span>
                  <span className="font-semibold text-foreground">{formatDateTime(job.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated At</span>
                  <span className="font-semibold text-foreground">{formatDateTime(job.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
