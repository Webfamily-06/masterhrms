"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCareerSalary, resolveCareerTenantSlug } from "@/lib/career-tenant";

const DEFAULT_JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Freelance",
  "Internship",
  "Remote",
  "Hybrid",
];

const VACANCY_BUCKETS = [
  { key: "1-5", label: "1-5", min: 1, max: 5 },
  { key: "6-15", label: "6-15", min: 6, max: 15 },
  { key: "16-25", label: "16-25", min: 16, max: 25 },
  { key: "25+", label: "25+", min: 25, max: Infinity },
];

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

function PublicCareersListingContent() {
  const searchParams = useSearchParams();
  const explicitTenant = searchParams.get("tenant");
  const tenantSlug = useMemo(() => resolveCareerTenantSlug(explicitTenant), [explicitTenant]);
  const tenantQuerySuffix = explicitTenant ? `?tenant=${encodeURIComponent(explicitTenant)}` : "";

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [locationFilter, setLocationFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedVacancies, setSelectedVacancies] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data, isLoading } = useQuery({
    queryKey: ["public-careers-portal", tenantSlug],
    queryFn: async () => {
      const endpoint =
        tenantSlug && tenantSlug !== "default"
          ? `/public/jobs/${encodeURIComponent(tenantSlug)}`
          : "/public/jobs";
      const res: any = await api.get(endpoint);
      return res?.data || res;
    },
  });

  const tenant = data?.tenant || null;
  const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
  const apiJobTypes: any[] = Array.isArray(data?.jobTypes) ? data.jobTypes : [];
  const apiJobLocations: any[] = Array.isArray(data?.jobLocations) ? data.jobLocations : [];
  const seo = data?.seo || null;

  // Apply Career Page SEO metadata
  useEffect(() => {
    if (seo?.metaTitle) {
      document.title = seo.metaTitle;
    } else if (tenant?.name) {
      document.title = `Careers at ${tenant.name}`;
    }
    if (seo?.metaDescription) {
      let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", seo.metaDescription);
    }
  }, [seo, tenant]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    apiJobLocations.forEach((l: any) => {
      if (l?.name) set.add(l.name);
    });
    jobs.forEach((j: any) => {
      const loc = j.jobLocation?.name || j.location;
      if (loc) set.add(loc);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [apiJobLocations, jobs]);

  const jobTypeOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_JOB_TYPES);
    apiJobTypes.forEach((t: any) => {
      if (t?.name) set.add(t.name);
    });
    jobs.forEach((j: any) => {
      const t = j.type?.name || formatEmploymentType(j.employmentType);
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [apiJobTypes, jobs]);

  const toggleType = (label: string) => {
    setPage(1);
    setSelectedTypes((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const toggleVacancy = (key: string) => {
    setPage(1);
    setSelectedVacancies((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSortBy("newest");
    setLocationFilter("all");
    setSalaryFilter("all");
    setSelectedTypes([]);
    setSelectedVacancies([]);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = jobs.filter((job: any) => {
      const locName = job.jobLocation?.name || job.location || "";
      const typeName = job.type?.name || formatEmploymentType(job.employmentType);
      const openings = Number(job.openingsCount || 1);
      const sMin = Number(job.salaryMin || 0);
      const sMax = Number(job.salaryMax || sMin);

      if (locationFilter !== "all" && locName !== locationFilter) return false;

      if (salaryFilter === "under-40k" && sMax > 40000) return false;
      if (salaryFilter === "40k-70k" && (sMax < 40000 || sMin > 70000)) return false;
      if (salaryFilter === "70k-100k" && (sMax < 70000 || sMin > 100000)) return false;
      if (salaryFilter === "100k+" && sMax < 100000) return false;

      if (selectedTypes.length > 0) {
        const lowerSelected = selectedTypes.map((s) => s.toLowerCase());
        if (!lowerSelected.includes(String(typeName).toLowerCase())) return false;
      }

      if (selectedVacancies.length > 0) {
        const matchesBucket = selectedVacancies.some((key) => {
          const b = VACANCY_BUCKETS.find((x) => x.key === key);
          return b ? openings >= b.min && openings <= b.max : false;
        });
        if (!matchesBucket) return false;
      }

      if (q) {
        const skillsText = Array.isArray(job.skills) ? job.skills.join(" ") : "";
        const hay = `${job.title || ""} ${job.branch?.name || ""} ${job.department?.name || ""} ${locName} ${typeName} ${skillsText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    list = [...list].sort((a: any, b: any) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === "salary_desc") {
        return Number(b.salaryMax || b.salaryMin || 0) - Number(a.salaryMax || a.salaryMin || 0);
      }
      if (sortBy === "salary_asc") {
        return Number(a.salaryMin || a.salaryMax || 0) - Number(b.salaryMin || b.salaryMax || 0);
      }
      if (sortBy === "vacancies_desc") {
        return Number(b.openingsCount || 1) - Number(a.openingsCount || 1);
      }
      // newest first (featured first within newest)
      if (Boolean(b.featuredJob) !== Boolean(a.featuredJob)) {
        return b.featuredJob ? 1 : -1;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return list;
  }, [jobs, searchQuery, sortBy, locationFilter, salaryFilter, selectedTypes, selectedVacancies]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Public Brand Header */}
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-semibold">
              <i className="ph ph-briefcase text-sm" />
              {jobs.length} Open {jobs.length === 1 ? "Role" : "Roles"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Top Count + Sort + Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {filtered.length} Available {filtered.length === 1 ? "Job" : "Jobs"}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground outline-none focus:border-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salary_desc">Salary: High to Low</option>
                <option value="salary_asc">Salary: Low to High</option>
                <option value="vacancies_desc">Most Vacancies</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search for jobs"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-xs text-foreground outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Sidebar + Job Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Filter Sidebar */}
          <aside className="lg:col-span-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <i className="ph ph-funnel text-base text-blue-600" />
              <span>Filter Jobs</span>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="all">All Locations</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Salary Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Salary Range</label>
              <select
                value={salaryFilter}
                onChange={(e) => {
                  setSalaryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="all">All Ranges</option>
                <option value="under-40k">Under ₹40,000</option>
                <option value="40k-70k">₹40,000 - ₹70,000</option>
                <option value="70k-100k">₹70,000 - ₹1,00,000</option>
                <option value="100k+">₹1,00,000+</option>
              </select>
            </div>

            {/* Job Type Checkboxes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Job Type</p>
              <div className="space-y-2">
                {jobTypeOptions.map((jt) => (
                  <label key={jt} className="flex items-center gap-2.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(jt)}
                      onChange={() => toggleType(jt)}
                      className="h-3.5 w-3.5 rounded border-border accent-emerald-600"
                    />
                    <span>{jt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vacancies Checkboxes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Vacancies</p>
              <div className="space-y-2">
                {VACANCY_BUCKETS.map((b) => (
                  <label key={b.key} className="flex items-center gap-2.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedVacancies.includes(b.key)}
                      onChange={() => toggleVacancy(b.key)}
                      className="h-3.5 w-3.5 rounded border-border accent-emerald-600"
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="w-full h-9 rounded-lg border border-border bg-background hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
            >
              Reset Filters
            </button>
          </aside>

          {/* Right Job Cards Grid */}
          <div className="lg:col-span-9 space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-72 rounded-2xl border border-border bg-card animate-pulse" />
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                  <i className="ph ph-briefcase text-2xl" />
                </div>
                <p className="text-sm font-bold text-foreground">No matching job openings found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search or clearing the sidebar filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginated.map((job: any) => {
                  const openings = Number(job.openingsCount || 1);
                  const branchName = job.branch?.name || job.department?.name || tenant?.name || "Main Office";
                  const locName = job.jobLocation?.name || job.location || "Remote";
                  const typeName = job.type?.name || formatEmploymentType(job.employmentType);
                  const skills: string[] = Array.isArray(job.skills) ? job.skills : [];

                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {openings} {openings === 1 ? "Vacancy" : "Vacancies"}
                          </span>
                          {job.featuredJob && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/25">
                              <i className="ph ph-star text-xs" />
                              Featured
                            </span>
                          )}
                        </div>

                        {/* Job Title */}
                        <h2 className="text-base font-bold text-foreground leading-snug">
                          {job.title}
                        </h2>

                        {/* Skills Chips */}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {skills.slice(0, 5).map((sk) => (
                              <span
                                key={sk}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium border border-border/60"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <i className="ph ph-buildings text-sm shrink-0" />
                            <span className="truncate">{branchName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <i className="ph ph-map-pin text-sm shrink-0" />
                            <span className="truncate">{locName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <i className="ph ph-clock text-sm shrink-0" />
                            <span className="truncate">{typeName}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <i className="ph ph-money text-sm text-amber-600 shrink-0" />
                            <span className="font-semibold text-foreground">
                              {formatCareerSalary(job.salaryMin, job.salaryMax)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Link
                        href={`/careers/${job.id}${tenantQuerySuffix}`}
                        className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center transition-colors shadow-xs"
                      >
                        Browse Job
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > pageSize && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground disabled:opacity-40 hover:bg-muted/60"
                >
                  <i className="ph ph-caret-left text-xs" />
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const num = i + 1;
                  const active = num === safePage;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      className={`h-9 min-w-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? "bg-emerald-600 text-white"
                          : "border border-border bg-card text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground disabled:opacity-40 hover:bg-muted/60"
                >
                  Next
                  <i className="ph ph-caret-right text-xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PublicCareersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-6">
          <div className="h-10 w-64 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <PublicCareersListingContent />
    </Suspense>
  );
}
