"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function formatMoney(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR",
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

export default function ViewOfferDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["hr-offer-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/offers/${id}`);
      return res?.data || res;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-52 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-36 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Offer not found</p>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/offers")}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const candName = offer.candidate?.fullName || "Candidate";
  const jobTitle = offer.jobPosting?.title || offer.designation?.name || "—";
  const jobCode = offer.jobPosting?.jobCode || "—";
  const deptName = offer.department?.name || offer.jobPosting?.department?.name || "—";
  const st = String(offer.status || "draft").toLowerCase();

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Offer Details</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View the full details and status of this job offer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/hr/recruitment/offers")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 self-start sm:self-auto"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-border/80 bg-card/50 p-5 space-y-5">
        {/* Top Summary Card */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">{candName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{jobCode}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-border bg-muted/60 text-xs font-semibold capitalize text-foreground">
              {st}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            <div className="flex items-start gap-2.5">
              <i className="ph ph-user text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Candidate</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{candName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <i className="ph ph-file-text text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Position</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{jobTitle}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <i className="ph ph-buildings text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Department</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{deptName}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <i className="ph ph-currency-dollar text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Salary</p>
                <p className="text-xs font-bold tabular-nums text-foreground mt-0.5">
                  {formatMoney(offer.annualCtc)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <i className="ph ph-calendar-blank text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{formatDate(offer.joiningDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <i className="ph ph-calendar-x text-muted-foreground text-base mt-0.5" />
              <div>
                <p className="text-muted-foreground">Expiration Date</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{formatDate(offer.expiresAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-foreground">Benefits</h3>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {offer.comments || "No benefits specified."}
          </p>
        </div>

        {/* Offer Information */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-foreground">Offer Information</h3>
          <div className="text-xs">
            <p className="text-muted-foreground">Offer Date</p>
            <p className="font-bold text-foreground mt-0.5">{formatDate(offer.createdAt)}</p>
          </div>
        </div>

        {/* Job Details */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Job Details</h3>
          <div className="space-y-2.5 text-xs">
            <div>
              <p className="text-muted-foreground">Job Title</p>
              <p className="font-bold text-foreground mt-0.5">{jobTitle}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Job Code</p>
              <p className="font-bold text-foreground mt-0.5">{jobCode}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
