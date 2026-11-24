"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { parseVariablesFromContent } from "../_components/offer-template-form";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function ViewOfferTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { data: tpl, isLoading } = useQuery({
    queryKey: ["hr-offer-template-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/offer-templates/${id}`);
      return res?.data || res;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-80 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="p-4 lg:p-6 w-full">
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Offer template not found</p>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/offer-templates")}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-xs font-semibold"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const body = String(tpl.bodyHtml || "");
  const vars: string[] =
    Array.isArray(tpl.variables) && tpl.variables.length > 0
      ? tpl.variables
      : parseVariablesFromContent(body);

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">View Offer Template</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview the content and details of this offer template.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/hr/recruitment/offer-templates/${tpl.id}/edit`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-pencil-simple text-sm" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/offer-templates")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="rounded-xl border border-border/80 bg-card/50 p-5 space-y-5">
        {/* Basic Information */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground">Template Name</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{tpl.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(tpl.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <div className="mt-1">
                {tpl.isActive !== false ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 border border-slate-500/20 font-semibold">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Template Content */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Template Content</h2>
          <div className="rounded-lg border border-border/80 bg-muted/30 p-5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {body}
          </div>
          <p className="text-[11px] text-muted-foreground">{body.length} characters</p>
        </div>

        {/* Variables */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">
            <i className="ph ph-code text-muted-foreground text-base" />
            Variables ({vars.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {vars.length === 0 ? (
              <p className="text-xs text-muted-foreground">No variables detected.</p>
            ) : (
              vars.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px] font-medium"
                >
                  {`{{${v}}}`}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
