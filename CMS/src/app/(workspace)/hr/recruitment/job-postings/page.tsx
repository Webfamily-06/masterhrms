"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouterState } from "@/lib/router-compat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatMoney(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function formatEmploymentType(job: any): string {
  if (job?.type?.name) return job.type.name;
  const raw = String(job?.employmentType || "Full-time");
  return raw
    .replace(/_/g, "-")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HrJobPostingsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "draft" | "published">(isEmployeePortal ? "published" : "all");
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: jobList = [], isLoading } = useQuery({
    queryKey: [isEmployeePortal ? "me-job-postings" : "hr-job-postings"],
    queryFn: async () => {
      const res: any = await api.get(
        isEmployeePortal ? "/me/recruitment/job-postings" : "/hr/recruitment/job-postings"
      );
      return Array.isArray(res) ? res : res?.data || res?.jobs || [];
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/hr/recruitment/job-postings/${id}/publish`, {}),
    onSuccess: () => {
      toast.success("Job posting published");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to publish job posting"),
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/hr/recruitment/job-postings/${id}/unpublish`, {}),
    onSuccess: () => {
      toast.success("Job posting moved to Draft");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to move job posting to Draft"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/job-postings/${id}`),
    onSuccess: () => {
      toast.success("Job posting deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete job posting"),
  });

  const counts = useMemo(() => {
    const all = jobList.length;
    const draft = jobList.filter((j: any) => String(j.status || "").toLowerCase() === "draft").length;
    const published = jobList.filter((j: any) =>
      ["published", "open"].includes(String(j.status || "").toLowerCase())
    ).length;
    return { all, draft, published };
  }, [jobList]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = jobList.filter((j: any) => {
      const st = String(j.status || "draft").toLowerCase();
      if (statusTab === "draft" && st !== "draft") return false;
      if (statusTab === "published" && !["published", "open"].includes(st)) return false;
      if (!q) return true;
      return (
        String(j.title || "").toLowerCase().includes(q) ||
        String(j.jobCode || "").toLowerCase().includes(q) ||
        String(j.location || j.jobLocation?.name || "").toLowerCase().includes(q) ||
        formatEmploymentType(j).toLowerCase().includes(q)
      );
    });
    if (sortAsc !== null) {
      list = [...list].sort((a: any, b: any) => {
        const cmp = String(a.title || "").localeCompare(String(b.title || ""));
        return sortAsc ? cmp : -cmp;
      });
    }
    return list;
  }, [jobList, searchQuery, statusTab, sortAsc]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Job Postings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage job postings and open positions in your organization.
          </p>
        </div>
        {!isEmployeePortal && (
          <Link
            href="/hr/recruitment/job-postings/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
          >
            <i className="ph-bold ph-plus text-sm" />
            Add Job Posting
          </Link>
        )}
      </div>

      {/* Search & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70">
          <div className="relative max-w-xs">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
        </div>
        <div className="flex items-center gap-5 px-4 pt-2.5">
          {[
            { key: "all" as const, label: "All", icon: "ph-squares-four", count: counts.all },
            { key: "draft" as const, label: "Draft", icon: "ph-file-text", count: counts.draft },
            { key: "published" as const, label: "Published", icon: "ph-upload-simple", count: counts.published },
          ].map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={`inline-flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`ph ${tab.icon} text-sm`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12">
                  #
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((prev) => (prev === null ? true : !prev))}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Title
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Salary Range
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Applications
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deadline
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="p-4">
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <i className="ph ph-briefcase text-3xl opacity-50" />
                      <p className="text-sm font-medium text-foreground">No job postings found</p>
                      <p className="text-xs">Click &ldquo;+ Add Job Posting&rdquo; to create your first opening.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job: any, idx: number) => {
                  const st = String(job.status || "draft").toLowerCase();
                  const isPublished = st === "published" || st === "open";
                  const deadlineStr = formatDate(job.closingDate);
                  const isExpired = deadlineStr !== "—" && deadlineStr < todayIso;
                  const appCount = job._count?.candidates ?? 0;
                  const salaryRange =
                    job.salaryMin || job.salaryMax
                      ? `${formatMoney(job.salaryMin || 0)} - ${formatMoney(job.salaryMax || 0)}`
                      : "—";

                  return (
                    <tr key={job.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Link
                            href={`/hr/recruitment/job-postings/${job.id}`}
                            className="text-xs font-semibold text-foreground hover:text-emerald-600 transition-colors block"
                          >
                            {job.title}
                          </Link>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-[10px] font-semibold tracking-wide">
                            {job.jobCode || `JOB-${String(idx + 1).padStart(5, "0")}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground">
                        {job.jobLocation?.name || job.location || "Remote"}
                      </td>
                      <td className="py-3.5 px-4 text-xs tabular-nums text-foreground whitespace-nowrap">
                        {salaryRange}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                          {appCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-[11px] font-medium whitespace-nowrap">
                          {formatEmploymentType(job)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPublished ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            Published
                          </span>
                        ) : st === "closed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 text-[11px] font-semibold">
                            Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isExpired ? "text-rose-600" : "text-muted-foreground"
                          }`}
                        >
                          <i className="ph ph-calendar-blank text-sm" />
                          {deadlineStr}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hr/recruitment/job-postings/${job.id}`}
                            title="View Job Posting"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10 transition-colors"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </Link>
                          {!isEmployeePortal && (
                            <>
                              <Link
                                href={`/hr/recruitment/job-postings/${job.id}/edit`}
                                title="Edit Job Posting"
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <i className="ph ph-pencil-simple-line text-[15px]" />
                              </Link>
                              {isPublished ? (
                                <button
                                  type="button"
                                  title="Unpublish (Move to Draft)"
                                  onClick={() => unpublishMutation.mutate(job.id)}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10 transition-colors"
                                >
                                  <i className="ph ph-download-simple text-[15px]" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Publish Job Posting"
                                  onClick={() => publishMutation.mutate(job.id)}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <i className="ph ph-upload-simple text-[15px]" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Delete Job Posting"
                                onClick={() => setDeleteTarget(job)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <i className="ph ph-trash text-[15px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ph ph-warning text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Job Posting</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.title}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
