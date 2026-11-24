"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCareerSalary, resolveCareerTenantSlug } from "@/lib/career-tenant";

function formatLongDate(val?: string | Date | null): string {
  if (!val) return "Open until filled";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatEmploymentType(raw?: string | null): string {
  if (!raw) return "Full-time";
  const map: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    temporary: "Temporary",
    freelance: "Freelance",
    internship: "Internship",
    remote: "Remote",
    hybrid: "Hybrid",
  };
  return map[raw.toLowerCase()] || raw;
}

function renderRichOrPlain(content?: string | null) {
  if (!content || !content.trim()) {
    return <p className="text-xs text-muted-foreground">No details provided.</p>;
  }
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);
  if (hasHtml) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
      {content}
    </div>
  );
}

function PublicCareerJobDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const explicitTenant = searchParams.get("tenant");
  const tenantSlug = useMemo(() => resolveCareerTenantSlug(explicitTenant), [explicitTenant]);
  const tenantQuerySuffix = explicitTenant ? `?tenant=${encodeURIComponent(explicitTenant)}` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["public-career-job-detail", tenantSlug, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(
        `/public/jobs/${encodeURIComponent(tenantSlug || "default")}/${encodeURIComponent(id)}`
      );
      return res?.data || res;
    },
  });

  const tenant = data?.tenant || null;
  const job = data?.job || null;
  const similarJobs: any[] = Array.isArray(data?.similarJobs) ? data.similarJobs : [];

  useEffect(() => {
    if (job?.title) {
      document.title = `${job.title} — ${tenant?.name || "Careers"}`;
    }
  }, [job, tenant]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-5">
        <div className="h-6 w-36 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 rounded-2xl border border-border bg-card animate-pulse" />
          <div className="lg:col-span-4 h-72 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
          <i className="ph ph-briefcase text-2xl" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Job opening not found</h1>
        <p className="text-xs text-muted-foreground">
          This position may have been closed or removed. Explore our other open opportunities.
        </p>
        <Link
          href={`/careers${tenantQuerySuffix}`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
        >
          <i className="ph ph-arrow-left text-sm" /> Back to All Jobs
        </Link>
      </div>
    );
  }

  const branchName = job.branch?.name || tenant?.name || "Main Office";
  const locationName = job.jobLocation?.name || job.location || "Remote";
  const deptName = job.department?.name || "General";
  const typeName = job.type?.name || formatEmploymentType(job.employmentType);
  const positions = Number(job.openingsCount || 1);
  const priorityLabel = job.priority ? `${job.priority} Priority` : null;
  const minExp = Number(job.minExperience || 0);
  const maxExp = Number(job.maxExperience || 0);
  const experienceText =
    minExp > 0 || maxExp > 0
      ? `${minExp.toFixed(1)} - ${Math.max(minExp, maxExp).toFixed(1)} years`
      : job.experienceLevel || "Open";

  const isExternalApply =
    String(job.jobApplicationType || "").toLowerCase().includes("custom") &&
    Boolean(job.applicationUrl);
  const applyHref = isExternalApply
    ? job.applicationUrl
    : `/careers/${job.id}/apply${tenantQuerySuffix}`;

  const priorityBadgeClass =
    String(job.priority || "").toLowerCase() === "high"
      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
      : String(job.priority || "").toLowerCase() === "medium"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-sky-500/10 text-sky-700 border-sky-500/20";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <Link href={`/careers${tenantQuerySuffix}`} className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-9 w-9 rounded-lg object-contain border border-border bg-background p-1"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {(tenant?.name || "C").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">
                {tenant?.name || "Company Careers"}
              </p>
              <p className="text-[11px] text-muted-foreground">Careers & Open Positions</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-8 space-y-5">
        <Link
          href={`/careers${tenantQuerySuffix}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back to All Jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Columns */}
          <div className="lg:col-span-8 space-y-5">
            {/* Hero Summary Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      {job.title}
                    </h1>
                    {job.featuredJob && (
                      <i className="ph-fill ph-star text-amber-400 text-xl" title="Featured Job" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{branchName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    Published
                  </span>
                  {priorityLabel && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${priorityBadgeClass}`}>
                      {priorityLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-map-pin text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Location</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{locationName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-buildings text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Department</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{deptName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-clock text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Type</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{typeName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-users text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Positions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{positions}</p>
                  </div>
                </div>
              </div>

              {/* Salary Range */}
              <div className="flex items-start gap-2.5">
                <i className="ph ph-currency-inr text-muted-foreground text-base mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-foreground">Salary Range</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {formatCareerSalary(job.salaryMin, job.salaryMax)}
                  </p>
                </div>
              </div>

              {/* Centered Apply CTA */}
              <div className="pt-2 flex justify-center">
                {isExternalApply ? (
                  <a
                    href={applyHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Apply for this Position
                    <i className="ph ph-arrow-square-out text-sm" />
                  </a>
                ) : (
                  <Link
                    href={applyHref}
                    className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Apply for this Position
                  </Link>
                )}
              </div>
            </div>

            {/* Job Description */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <h2 className="text-lg font-bold text-foreground">Job Description</h2>
              {renderRichOrPlain(job.description)}
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
                <h2 className="text-lg font-bold text-foreground">Requirements</h2>
                {renderRichOrPlain(job.requirements)}
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
                <h2 className="text-lg font-bold text-foreground">Benefits & Perks</h2>
                {renderRichOrPlain(job.benefits)}
              </div>
            )}

            {/* Skills */}
            {Array.isArray(job.skills) && job.skills.length > 0 && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
                <h2 className="text-lg font-bold text-foreground">Key Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((sk: string) => (
                    <span
                      key={sk}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-medium border border-border/70"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Columns Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Quick Apply */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-foreground">Quick Apply</h3>
              {isExternalApply ? (
                <a
                  href={applyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center transition-colors shadow-xs"
                >
                  Apply Now
                </a>
              ) : (
                <Link
                  href={applyHref}
                  className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center transition-colors shadow-xs"
                >
                  Apply Now
                </Link>
              )}
              <p className="text-[11px] text-center text-muted-foreground">
                Application takes less than 5 minutes
              </p>
            </div>

            {/* Job Information */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground">Job Information</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-calendar-blank text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Posted Date</p>
                    <p className="text-muted-foreground mt-0.5">{formatLongDate(job.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-calendar-x text-rose-500 text-base mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Application Deadline</p>
                    <p className="text-rose-600 font-medium mt-0.5">{formatLongDate(job.closingDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-briefcase text-muted-foreground text-base mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Experience Required</p>
                    <p className="text-muted-foreground mt-0.5">{experienceText}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
                <h3 className="text-sm font-bold text-foreground">Similar Jobs</h3>
                <div className="space-y-3">
                  {similarJobs.map((sim: any) => (
                    <Link
                      key={sim.id}
                      href={`/careers/${sim.id}${tenantQuerySuffix}`}
                      className="block rounded-xl border border-border/80 p-3.5 hover:border-emerald-500/40 hover:bg-muted/30 transition-all space-y-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{sim.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {sim.branch?.name || tenant?.name || "Main Office"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 truncate">
                          <i className="ph ph-map-pin text-xs shrink-0" />
                          <span className="truncate">{sim.jobLocation?.name || sim.location || "Remote"}</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-semibold shrink-0">
                          {Number(sim.openingsCount || 1)} Positions
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function PublicCareerJobDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
          <div className="h-96 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      }
    >
      <PublicCareerJobDetailContent />
    </Suspense>
  );
}
