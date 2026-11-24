"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function formatMoney(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "₹0.00";
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

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

export default function ViewCandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { data: cand, isLoading } = useQuery({
    queryKey: ["hr-candidate-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/candidates/${id}`);
      return res?.data || res;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!cand) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Candidate not found</p>
          <button type="button" onClick={() => router.push("/hr/recruitment/candidates")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold">
            <i className="ph ph-arrow-left text-sm" /> Back
          </button>
        </div>
      </div>
    );
  }

  const latestOffer = Array.isArray(cand.offers) && cand.offers.length > 0 ? cand.offers[0] : null;
  const stageUpper = String(cand.stage || "NEW").toUpperCase();
  const isHired = stageUpper === "HIRED";
  const screeningAnswers: any[] = Array.isArray(cand.screeningAnswers) ? cand.screeningAnswers : [];

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{cand.fullName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Candidate profile</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/hr/recruitment/candidates")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 self-start sm:self-auto"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden max-w-5xl mx-auto">
        {/* Top Banner */}
        <div className="p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-muted border border-border flex items-center justify-center text-xl font-bold text-foreground shrink-0">
              {getInitials(cand.fullName)}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">{cand.fullName}</h2>
              {(cand.currentPosition || cand.currentCompany) && (
                <p className="text-xs text-muted-foreground">
                  {[cand.currentPosition, cand.currentCompany].filter(Boolean).join(" • ")}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <i className="ph ph-envelope-simple text-sm" />
                  {cand.email}
                </span>
                {cand.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ph ph-phone text-sm" />
                    {cand.phone}
                  </span>
                )}
                {cand.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ph ph-map-pin text-sm" />
                    {cand.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Circular Status Stamp */}
          <div
            className={`h-20 w-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center -rotate-12 shrink-0 ${
              isHired
                ? "border-emerald-600 text-emerald-700 bg-emerald-500/5"
                : stageUpper === "REJECTED"
                  ? "border-rose-600 text-rose-700 bg-rose-500/5"
                  : "border-blue-600 text-blue-700 bg-blue-500/5"
            }`}
          >
            <i className={`ph-bold ${isHired ? "ph-check" : "ph-seal-check"} text-xs`} />
            <span className="text-[11px] font-extrabold tracking-wider">{stageUpper}</span>
            <span className="text-[8px] font-semibold tracking-widest opacity-80">VERIFIED</span>
          </div>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/70">
          {/* Left Column (4 cols) */}
          <div className="lg:col-span-4 p-6 space-y-6 text-xs">
            {/* Applied For */}
            <div className="space-y-2.5">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
                <i className="ph ph-briefcase text-sm" /> Applied For
              </p>
              <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
                <p className="text-sm font-bold text-foreground">{cand.jobPosting?.title || "—"}</p>
                {cand.jobPosting?.jobCode && (
                  <p className="text-[11px] text-muted-foreground">{cand.jobPosting.jobCode}</p>
                )}
                <div className="space-y-1.5 pt-1 text-[11px] text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <i className="ph ph-clock text-xs" />
                    {cand.jobPosting?.type?.name || cand.jobPosting?.employmentType || "Full-time"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <i className="ph ph-map-pin text-xs" />
                    {cand.jobPosting?.jobLocation?.name || cand.jobPosting?.location || "Remote"}
                  </p>
                  {cand.jobPosting?.department?.name && (
                    <p className="flex items-center gap-1.5">
                      <i className="ph ph-buildings text-xs" />
                      {cand.jobPosting.department.name}
                    </p>
                  )}
                  {cand.jobPosting?.branch?.name && (
                    <p className="flex items-center gap-1.5">
                      <i className="ph ph-building text-xs" />
                      {cand.jobPosting.branch.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Salary */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
                <i className="ph ph-money text-sm" /> Salary
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-muted-foreground">Current</p>
                  <p className="text-sm font-bold text-foreground">{formatMoney(cand.currentCtc ?? cand.currentSalary)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected</p>
                  <p className="text-sm font-bold text-foreground">{formatMoney(cand.expectedSalary)}</p>
                </div>
                {latestOffer && (
                  <div>
                    <p className="text-muted-foreground">Final Offer</p>
                    <p className="text-sm font-bold text-foreground">{formatMoney(latestOffer.annualCtc)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Application */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
                <i className="ph ph-calendar-blank text-sm" /> Application
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-muted-foreground">Applied</p>
                  <p className="font-bold text-foreground">{formatDate(cand.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-bold text-foreground">{cand.source?.name || cand.sourceName || "Direct"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Terms &amp; Conditions</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                    Accepted
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (8 cols) */}
          <div className="lg:col-span-8 p-6 space-y-6 text-xs">
            {/* Personal Details */}
            <div className="space-y-3">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground border-b border-border/60 pb-2 w-full">
                <i className="ph ph-user text-sm" /> Personal Details
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-bold text-foreground mt-0.5">{formatDate(cand.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Notice Period</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {cand.noticePeriodDays ? `${cand.noticePeriodDays} days` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experience</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {Number(cand.yearsOfExperience || 0)} years
                  </p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground border-b border-border/60 pb-2 w-full">
                <i className="ph ph-map-pin text-sm" /> Address
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.address || cand.location || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.city || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">State</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.state || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.country || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Zip Code</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.zipCode || "—"}</p>
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div className="space-y-2.5">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground border-b border-border/60 pb-2 w-full">
                <i className="ph ph-envelope-open text-sm" /> Cover Letter
              </p>
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-foreground leading-relaxed whitespace-pre-wrap">
                {cand.coverLetter || "No cover letter provided."}
              </div>
            </div>

            {/* Screening Questions */}
            {screeningAnswers.length > 0 && (
              <div className="space-y-2.5">
                <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground border-b border-border/60 pb-2 w-full">
                  <i className="ph ph-medal text-sm" /> Screening Questions
                </p>
                <div className="space-y-3">
                  {screeningAnswers.map((qa: any, idx: number) => (
                    <div key={idx}>
                      <p className="font-bold text-foreground">{qa.question}</p>
                      <p className="text-muted-foreground mt-0.5">{qa.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="space-y-2.5">
              <p className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground border-b border-border/60 pb-2 w-full">
                <i className="ph ph-file-text text-sm" /> Documents
              </p>
              {cand.resumeUrl || cand.coverLetterUrl ? (
                <div className="flex flex-wrap gap-3">
                  {cand.resumeUrl && (
                    <a
                      href={cand.resumeUrl}
                      download={cand.resumeFileName || `${cand.fullName || "candidate"}-resume.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-6 rounded-xl border border-border/80 bg-background hover:bg-muted/40 p-3.5 min-w-[260px] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <i className="ph ph-file-pdf text-lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {cand.resumeFileName || "Resume / CV"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Click to download</p>
                        </div>
                      </div>
                      <i className="ph ph-download-simple text-base text-muted-foreground shrink-0" />
                    </a>
                  )}
                  {cand.coverLetterUrl && (
                    <a
                      href={cand.coverLetterUrl}
                      download={cand.coverLetterFileName || `${cand.fullName || "candidate"}-cover-letter.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-6 rounded-xl border border-border/80 bg-background hover:bg-muted/40 p-3.5 min-w-[260px] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <i className="ph ph-file-text text-lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {cand.coverLetterFileName || "Cover Letter"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Click to download</p>
                        </div>
                      </div>
                      <i className="ph ph-download-simple text-base text-muted-foreground shrink-0" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No documents uploaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
