"use client";

import React, { useMemo, useState } from "react";
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

function formatTime(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

function Stars({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={`${n <= rounded ? "ph-fill" : "ph"} ph-star text-xs`} />
      ))}
    </div>
  );
}

export default function ViewInterviewDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [selectedFbIdx, setSelectedFbIdx] = useState(0);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({
    interviewerName: "",
    recommendation: "Hire",
    technical: "4",
    communication: "4",
    culturalFit: "4",
    strengths: "",
    weaknesses: "",
    comments: "",
  });

  const { data: interview, isLoading } = useQuery({
    queryKey: ["hr-interview-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/interviews/${id}`);
      return res?.data || res;
    },
  });

  const addFeedbackMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/hr/recruitment/interviews/${id}/feedback`, fbForm);
    },
    onSuccess: () => {
      toast.success("Interview feedback submitted");
      setShowAddFeedback(false);
      setFbForm({
        interviewerName: "",
        recommendation: "Hire",
        technical: "4",
        communication: "4",
        culturalFit: "4",
        strengths: "",
        weaknesses: "",
        comments: "",
      });
      queryClient.invalidateQueries({ queryKey: ["hr-interview-detail", id] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit feedback"),
  });

  const feedbackList: any[] = useMemo(
    () => (Array.isArray(interview?.feedbackList) ? interview.feedbackList : []),
    [interview]
  );

  const summary = useMemo(() => {
    if (feedbackList.length === 0) {
      return { avg: 0, tech: 0, comm: 0, cult: 0, recs: {} as Record<string, number> };
    }
    const tech = feedbackList.reduce((s, f) => s + Number(f.technical || 0), 0) / feedbackList.length;
    const comm = feedbackList.reduce((s, f) => s + Number(f.communication || 0), 0) / feedbackList.length;
    const cult = feedbackList.reduce((s, f) => s + Number(f.culturalFit || 0), 0) / feedbackList.length;
    const avg = (tech + comm + cult) / 3;
    const recs: Record<string, number> = {
      "Strong Hire": 0,
      Hire: 0,
      Maybe: 0,
      Reject: 0,
      "Strong Reject": 0,
    };
    feedbackList.forEach((f) => {
      const key = f.recommendation || "Hire";
      recs[key] = (recs[key] || 0) + 1;
    });
    return {
      avg: Number(avg.toFixed(1)),
      tech: Number(tech.toFixed(1)),
      comm: Number(comm.toFixed(1)),
      cult: Number(cult.toFixed(1)),
      recs,
    };
  }, [feedbackList]);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-72 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Interview not found</p>
          <button type="button" onClick={() => router.push("/hr/recruitment/interviews")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold">
            <i className="ph ph-arrow-left text-sm" /> Back
          </button>
        </div>
      </div>
    );
  }

  const cand = interview.candidate || {};
  const interviewers: any[] = Array.isArray(interview.interviewers) ? interview.interviewers : [];
  const activeFb = feedbackList[selectedFbIdx] || feedbackList[0] || null;
  const hasFeedback = feedbackList.length > 0 || Boolean(interview.feedback);

  // Triangle radar points (center 90,85, radius 60)
  const cx = 90;
  const cy = 88;
  const maxR = 55;
  const pTech = { x: cx, y: cy - (maxR * Math.min(5, summary.tech)) / 5 };
  const pComm = { x: cx - ((maxR * Math.min(5, summary.comm)) / 5) * 0.866, y: cy + ((maxR * Math.min(5, summary.comm)) / 5) * 0.5 };
  const pCult = { x: cx + ((maxR * Math.min(5, summary.cult)) / 5) * 0.866, y: cy + ((maxR * Math.min(5, summary.cult)) / 5) * 0.5 };

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Interview Details</h1>
          <p className="text-xs text-muted-foreground mt-0.5">View interview information.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAddFeedback(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <i className="ph-bold ph-plus text-sm" />
            Add Feedback
          </button>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/interviews")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>

      {/* Main 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Interview Details Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-briefcase text-lg" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Interview Details</h2>
                <p className="text-xs text-muted-foreground">Schedule and interview information</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-briefcase text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Job</p>
                  <p className="font-bold text-foreground mt-0.5">{cand.jobPosting?.title || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-target text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Round</p>
                  <span className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                    {interview.roundName || "Initial Screening"}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-tag text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Interview Type</p>
                  <p className="font-bold text-foreground mt-0.5">{interview.interviewType || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-calendar-blank text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-bold text-foreground mt-0.5">{formatDate(interview.scheduledAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-clock text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Time</p>
                  <p className="font-bold text-foreground mt-0.5">{formatTime(interview.scheduledAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-timer text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-bold text-foreground mt-0.5">{interview.durationMinutes || 60} min</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-check-circle text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <span className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-semibold capitalize">
                    {String(interview.status || "scheduled").replace("_", "-")}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-chat-text text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Feedback</p>
                  <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded border font-semibold ${hasFeedback ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}`}>
                    {hasFeedback ? "Submitted" : "Pending"}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-emerald-600 shrink-0">
                  <i className="ph ph-map-pin text-sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  {interview.meetingLink ? (
                    <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="font-bold text-emerald-600 hover:underline mt-0.5 inline-flex items-center gap-1">
                      <i className="ph ph-video-camera text-sm" /> Join Online Interview
                    </a>
                  ) : (
                    <p className="font-bold text-foreground mt-0.5">{interview.location || "Office"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Feedback Summary */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-chart-pie-slice text-lg" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Interview Feedback Summary</h2>
                <p className="text-xs text-muted-foreground">Overall feedback of the interview</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/80 bg-background p-5 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">Overall Average Rating</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {summary.avg || 0}
                  <span className="text-base text-muted-foreground font-semibold">/5</span>
                </p>
                <Stars score={summary.avg} />
                <p className="text-[11px] text-muted-foreground">
                  Based on {feedbackList.length} feedback
                </p>
              </div>
              <div className="md:col-span-2 rounded-xl border border-border/80 bg-background p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Recommendation Breakdown</p>
                  <p className="text-[10px] font-semibold text-foreground">Technical {summary.tech}/5</p>
                  <svg viewBox="0 0 180 155" className="w-40 h-36">
                    {[1, 0.66, 0.33].map((scale) => {
                      const r = maxR * scale;
                      const pts = `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;
                      return <polygon key={scale} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
                    })}
                    {feedbackList.length > 0 && (
                      <polygon
                        points={`${pTech.x},${pTech.y} ${pComm.x},${pComm.y} ${pCult.x},${pCult.y}`}
                        fill="rgba(16, 185, 129, 0.25)"
                        stroke="#10b981"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                  <div className="flex items-center justify-between w-full px-2 text-[10px] font-semibold text-foreground">
                    <span>Communication {summary.comm}/5</span>
                    <span>Cultural Fit {summary.cult}/5</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Strong Hire", dot: "bg-emerald-600" },
                    { label: "Hire", dot: "bg-emerald-400" },
                    { label: "Maybe", dot: "bg-amber-400" },
                    { label: "Reject", dot: "bg-orange-500" },
                    { label: "Strong Reject", dot: "bg-rose-600" },
                  ].map((r) => {
                    const cnt = summary.recs[r.label] || 0;
                    const pct = feedbackList.length ? Math.round((cnt / feedbackList.length) * 100) : 0;
                    return (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-foreground font-medium">
                          <span className={`h-2 w-2 rounded-full ${r.dot}`} />
                          {r.label}
                        </span>
                        <span className="font-bold text-foreground">
                          {cnt} <span className="font-normal text-muted-foreground">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback by Interviewers */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-chat-circle-text text-lg" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Feedback by Interviewers</h2>
                <p className="text-xs text-muted-foreground">Feedback from all interviewers</p>
              </div>
            </div>
            {feedbackList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No interviewer feedback submitted yet. Click &ldquo;+ Add Feedback&rdquo; above to record feedback.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/70">
                <div className="md:col-span-4 divide-y divide-border/60">
                  {feedbackList.map((fb, idx) => (
                    <button
                      key={fb.id || idx}
                      type="button"
                      onClick={() => setSelectedFbIdx(idx)}
                      className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                        selectedFbIdx === idx ? "bg-emerald-500/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-bold ${selectedFbIdx === idx ? "text-emerald-700" : "text-foreground"}`}>
                          {fb.interviewerName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] text-muted-foreground">{fb.interviewerRole || "Interviewer"}</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-semibold">
                            {fb.recommendation}
                          </span>
                        </div>
                      </div>
                      <i className="ph ph-caret-right text-xs text-muted-foreground" />
                    </button>
                  ))}
                </div>
                {activeFb && (
                  <div className="md:col-span-8 p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Interviewer Feedback</h3>
                      <p className="text-xs text-muted-foreground">Submitted by {activeFb.interviewerName}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Overall Score", val: activeFb.overallScore },
                        { label: "Technical", val: activeFb.technical },
                        { label: "Communication", val: activeFb.communication },
                        { label: "Cultural Fit", val: activeFb.culturalFit },
                      ].map((m) => (
                        <div key={m.label} className="rounded-xl border border-border/80 bg-background p-3 text-center space-y-1">
                          <p className="text-[11px] text-muted-foreground">{m.label}</p>
                          <p className="text-base font-bold text-foreground">{m.val} / 5</p>
                          <Stars score={Number(m.val)} />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Candidate Strengths</p>
                        <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-foreground">
                          {activeFb.strengths || "—"}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Candidate Weaknesses</p>
                        <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-foreground">
                          {activeFb.weaknesses || "—"}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">General Comments</p>
                        <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-foreground">
                          {activeFb.comments || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Candidate Details + Interviewers */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-user text-base" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Candidate Details</h3>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                <div className="h-10 w-10 rounded-full bg-rose-500/15 text-rose-700 border border-rose-500/25 flex items-center justify-center text-xs font-bold">
                  {getInitials(cand.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{cand.fullName || "—"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{cand.email || "—"}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-semibold text-foreground">{cand.phone || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Company</span>
                  <span className="font-semibold text-foreground">{cand.currentCompany || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-semibold text-foreground">
                    {cand.yearsOfExperience !== null && cand.yearsOfExperience !== undefined ? `${cand.yearsOfExperience} years` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Notice Period</span>
                  <span className="font-semibold text-foreground">
                    {cand.noticePeriodDays ? `${cand.noticePeriodDays} days` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">Status</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold capitalize">
                    {cand.stage || "Interview"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-users-three text-base" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Interviewers</h3>
                <p className="text-[11px] text-muted-foreground">Assigned Interviewers</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {interviewers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No interviewers assigned.</p>
              ) : (
                interviewers.map((ev: any) => {
                  const name = [ev.firstName, ev.lastName].filter(Boolean).join(" ") || ev.email;
                  return (
                    <div key={ev.id} className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-500/15 text-blue-700 border border-blue-500/25 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{ev.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Feedback Modal */}
      {showAddFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Add Interview Feedback</h3>
              <button type="button" onClick={() => setShowAddFeedback(false)} className="text-muted-foreground hover:text-foreground">
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addFeedbackMutation.mutate();
              }}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Interviewer Name *</label>
                <input
                  type="text"
                  required
                  value={fbForm.interviewerName}
                  onChange={(e) => setFbForm((p) => ({ ...p, interviewerName: e.target.value }))}
                  placeholder="e.g. Helena Willms"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Recommendation</label>
                <select
                  value={fbForm.recommendation}
                  onChange={(e) => setFbForm((p) => ({ ...p, recommendation: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs"
                >
                  {["Strong Hire", "Hire", "Maybe", "Reject", "Strong Reject"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "technical", label: "Technical (1-5)" },
                  { key: "communication", label: "Comm. (1-5)" },
                  { key: "culturalFit", label: "Cultural (1-5)" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">{f.label}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={(fbForm as any)[f.key]}
                      onChange={(e) => setFbForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Candidate Strengths</label>
                <textarea rows={2} value={fbForm.strengths} onChange={(e) => setFbForm((p) => ({ ...p, strengths: e.target.value }))} className="w-full p-2.5 rounded-lg border border-border bg-background text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Candidate Weaknesses</label>
                <textarea rows={2} value={fbForm.weaknesses} onChange={(e) => setFbForm((p) => ({ ...p, weaknesses: e.target.value }))} className="w-full p-2.5 rounded-lg border border-border bg-background text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">General Comments</label>
                <textarea rows={2} value={fbForm.comments} onChange={(e) => setFbForm((p) => ({ ...p, comments: e.target.value }))} className="w-full p-2.5 rounded-lg border border-border bg-background text-xs" />
              </div>
              <div className="pt-2 border-t border-border/70 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddFeedback(false)} className="h-9 px-4 rounded-lg border border-border text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={addFeedbackMutation.isPending} className="h-9 px-5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                  {addFeedbackMutation.isPending ? "Saving..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
