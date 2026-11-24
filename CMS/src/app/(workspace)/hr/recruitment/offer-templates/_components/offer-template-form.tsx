"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface VariableDefinition {
  key: string;
  label: string;
  category: "Candidate & Role" | "Company & Schedule" | "Compensation & Benefits" | "Equipment & Performance";
  sourceHint: string;
}

export const OFFER_VARIABLE_CATALOG: VariableDefinition[] = [
  // Candidate & Role
  { key: "candidate_name", label: "Candidate Name", category: "Candidate & Role", sourceHint: "Candidate" },
  { key: "candidate_email", label: "Candidate Email", category: "Candidate & Role", sourceHint: "Candidate" },
  { key: "job_title", label: "Job Title", category: "Candidate & Role", sourceHint: "Job Posting" },
  { key: "department", label: "Department", category: "Candidate & Role", sourceHint: "Job Posting" },
  { key: "team_name", label: "Team Name", category: "Candidate & Role", sourceHint: "Department / Team" },
  { key: "work_model", label: "Work Model", category: "Candidate & Role", sourceHint: "Job Type" },
  { key: "location", label: "Location", category: "Candidate & Role", sourceHint: "Job Location" },
  { key: "start_date", label: "Start Date", category: "Candidate & Role", sourceHint: "Job / Offer" },
  { key: "hiring_manager_name", label: "Hiring Manager Name", category: "Candidate & Role", sourceHint: "Employee" },
  { key: "manager_name", label: "Reporting Manager", category: "Candidate & Role", sourceHint: "Employee" },
  { key: "hr_manager_name", label: "HR Manager Name", category: "Candidate & Role", sourceHint: "Employee" },

  // Company & Schedule
  { key: "company_name", label: "Company Name", category: "Company & Schedule", sourceHint: "Workspace" },
  { key: "time_zone", label: "Time Zone", category: "Company & Schedule", sourceHint: "Workspace" },
  { key: "working_hours", label: "Working Hours", category: "Company & Schedule", sourceHint: "Shift / Policy" },
  { key: "meeting_schedule", label: "Meeting Schedule", category: "Company & Schedule", sourceHint: "Policy" },
  { key: "office_visit_requirements", label: "Office Visit Requirements", category: "Company & Schedule", sourceHint: "Policy" },
  { key: "probation_period", label: "Probation Period", category: "Company & Schedule", sourceHint: "Policy" },
  { key: "notice_period", label: "Notice Period", category: "Company & Schedule", sourceHint: "Policy" },
  { key: "acceptance_date", label: "Acceptance Date", category: "Company & Schedule", sourceHint: "Offer" },
  { key: "offer_expiry_date", label: "Offer Expiry Date", category: "Company & Schedule", sourceHint: "Offer" },

  // Compensation & Benefits
  { key: "annual_salary", label: "Annual Salary", category: "Compensation & Benefits", sourceHint: "Job Posting" },
  { key: "salary", label: "Salary", category: "Compensation & Benefits", sourceHint: "Job Posting" },
  { key: "bonus", label: "Performance Bonus", category: "Compensation & Benefits", sourceHint: "Offer" },
  { key: "remote_allowance", label: "Remote Allowance", category: "Compensation & Benefits", sourceHint: "Benefits" },
  { key: "internet_allowance", label: "Internet Allowance", category: "Compensation & Benefits", sourceHint: "Benefits" },
  { key: "health_benefits", label: "Health Benefits", category: "Compensation & Benefits", sourceHint: "Job Posting" },
  { key: "benefits", label: "Benefits Summary", category: "Compensation & Benefits", sourceHint: "Job Posting" },
  { key: "vacation_days", label: "Vacation Days", category: "Compensation & Benefits", sourceHint: "Leave Policy" },

  // Equipment & Performance
  { key: "equipment_list", label: "Equipment List", category: "Equipment & Performance", sourceHint: "IT Assets" },
  { key: "computer_specs", label: "Computer Specs", category: "Equipment & Performance", sourceHint: "IT Assets" },
  { key: "software_provided", label: "Software Provided", category: "Equipment & Performance", sourceHint: "IT Assets" },
  { key: "communication_tools", label: "Communication Tools", category: "Equipment & Performance", sourceHint: "Workspace" },
  { key: "performance_metrics", label: "Performance Metrics", category: "Equipment & Performance", sourceHint: "Performance" },
];

const DEFAULT_OFFER_CONTENT = `Dear {{candidate_name}},

We are pleased to extend an offer of employment for the position of {{job_title}} at {{company_name}}. We believe your skills and experience will be a valuable addition to the {{team_name}} team.

Position Details:
- Job Title: {{job_title}}
- Work Model: {{work_model}}
- Time Zone: {{time_zone}}
- Start Date: {{start_date}}
- Hiring Manager: {{hiring_manager_name}}

Compensation & Benefits:
- Annual Salary: {{annual_salary}}
- Remote Allowance: {{remote_allowance}}
- Internet Allowance: {{internet_allowance}}
- Health Benefits: {{health_benefits}}
- Vacation Days: {{vacation_days}}

Equipment & Work Setup:
- Equipment List: {{equipment_list}}
- Computer Specs: {{computer_specs}}
- Software Provided: {{software_provided}}
- Communication Tools: {{communication_tools}}
- Meeting Schedule: {{meeting_schedule}}
- Office Visit Requirements: {{office_visit_requirements}}
- Performance Metrics: {{performance_metrics}}

Please confirm your acceptance of this offer by {{acceptance_date}}.

Best regards,
{{hiring_manager_name}}
{{company_name}}`;

export function parseVariablesFromContent(content: string): string[] {
  const matches = Array.from(String(content || "").matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1])));
}

interface OfferTemplateFormProps {
  mode: "create" | "edit";
  templateId?: string;
}

export function OfferTemplateForm({ mode, templateId }: OfferTemplateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hydrated, setHydrated] = useState(mode === "create");

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [content, setContent] = useState(mode === "create" ? DEFAULT_OFFER_CONTENT : "");
  const [variablesText, setVariablesText] = useState(
    mode === "create" ? parseVariablesFromContent(DEFAULT_OFFER_CONTENT).join(", ") : ""
  );
  const [varSearch, setVarSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["hr-offer-template-detail", templateId],
    enabled: mode === "edit" && Boolean(templateId),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/offer-templates/${templateId}`);
      return res?.data || res;
    },
  });

  useEffect(() => {
    if (mode === "edit" && existing && !hydrated) {
      const body = existing.bodyHtml || "";
      const vars =
        Array.isArray(existing.variables) && existing.variables.length > 0
          ? existing.variables
          : parseVariablesFromContent(body);
      setName(existing.name || "");
      setStatus(existing.isActive !== false ? "active" : "inactive");
      setContent(body);
      setVariablesText(vars.join(", "));
      setHydrated(true);
    }
  }, [mode, existing, hydrated]);

  const usedVariableSet = useMemo(() => {
    return new Set(parseVariablesFromContent(content));
  }, [content]);

  const handleContentChange = (nextContent: string) => {
    setContent(nextContent);
    const detected = parseVariablesFromContent(nextContent);
    if (detected.length > 0) {
      setVariablesText(detected.join(", "));
    }
  };

  const insertVariableAtCursor = (varKey: string) => {
    const token = `{{${varKey}}}`;
    const el = textareaRef.current;
    let nextContent = content;
    if (el) {
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      nextContent = content.slice(0, start) + token + content.slice(end);
      handleContentChange(nextContent);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      nextContent = `${content}${content.endsWith(" ") || !content ? "" : " "}${token}`;
      handleContentChange(nextContent);
    }
    toast.success(`Inserted ${token}`, { duration: 1500 });
  };

  const categories = [
    "All",
    "Candidate & Role",
    "Company & Schedule",
    "Compensation & Benefits",
    "Equipment & Performance",
  ];

  const filteredCatalog = useMemo(() => {
    const q = varSearch.trim().toLowerCase();
    return OFFER_VARIABLE_CATALOG.filter((v) => {
      if (activeCategory !== "All" && v.category !== activeCategory) return false;
      if (!q) return true;
      return (
        v.key.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.sourceHint.toLowerCase().includes(q)
      );
    });
  }, [varSearch, activeCategory]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Template Name is required.");
      if (!content.trim()) throw new Error("Template Content is required.");
      const parsedVars = variablesText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const payload = {
        name: name.trim(),
        bodyHtml: content,
        variables: parsedVars.length > 0 ? parsedVars : parseVariablesFromContent(content),
        isActive: status === "active",
      };
      if (mode === "edit" && templateId) {
        return await api.put(`/hr/recruitment/offer-templates/${templateId}`, payload);
      }
      return await api.post("/hr/recruitment/offer-templates", payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Offer template updated" : "Offer template created");
      queryClient.invalidateQueries({ queryKey: ["hr-offer-templates"] });
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ["hr-offer-template-detail", templateId] });
      }
      router.push("/hr/recruitment/offer-templates");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save offer template"),
  });

  if (mode === "edit" && isLoading) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {mode === "edit" ? "Edit Offer Template" : "Create Offer Template"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "edit"
              ? "Update the content, dynamic variables, and settings of this offer template."
              : "Create a reusable offer letter template and click any variable to insert it directly."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/hr/recruitment/offer-templates")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60 self-start sm:self-auto"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back
        </button>
      </div>

      {/* Main Form Container */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="rounded-xl border border-border/80 bg-card/50 p-5 space-y-5"
      >
        {/* Basic Information */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/70">
            <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Full-Time Offer"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Template Content + Interactive Variable Picker Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Template Content (Left 7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/70 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">Template Content</h2>
              <span className="text-[11px] font-medium text-muted-foreground">
                {usedVariableSet.size} variables in use
              </span>
            </div>
            <div className="p-5 space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Content <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Click any variable on the right panel to insert {"{{variable_name}}"} at your cursor.
              </p>
              <textarea
                ref={textareaRef}
                rows={18}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your offer letter template using {{candidate_name}}, {{job_title}}, etc."
                className="w-full p-3.5 rounded-lg border border-border bg-background text-xs text-foreground leading-relaxed outline-none focus:border-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Interactive Variable Picker Panel (Right 5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="ph ph-brackets-curly text-emerald-600 text-base" />
                <h2 className="text-sm font-bold text-foreground">Pick Application Variables</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">Click to insert</span>
            </div>
            <div className="p-4 space-y-3">
              {/* Search Variables */}
              <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                <input
                  type="text"
                  value={varSearch}
                  onChange={(e) => setVarSearch(e.target.value)}
                  placeholder="Search variables (e.g. salary, work_model, equipment)..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      activeCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Clickable Variable Chips */}
              <div className="max-h-[340px] overflow-y-auto pr-1 space-y-1.5">
                {filteredCatalog.map((v) => {
                  const isUsed = usedVariableSet.has(v.key);
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariableAtCursor(v.key)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                        isUsed
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-border/80 bg-background hover:border-emerald-500/50 hover:bg-muted/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">{v.label}</span>
                          {isUsed && (
                            <i className="ph-fill ph-check-circle text-emerald-600 text-xs shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate">
                          {`{{${v.key}}}`}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                        {v.sourceHint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Variables Comma List */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Variables</h2>
            <button
              type="button"
              onClick={() => {
                const detected = parseVariablesFromContent(content);
                setVariablesText(detected.join(", "));
                toast.success(`Synced ${detected.length} variables from content`);
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              <i className="ph ph-arrows-clockwise text-xs" />
              Auto-Sync from Content
            </button>
          </div>
          <div className="p-5 space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Variables <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Comma-separated list of variable names (without {"{{}}"}) — automatically updated as you pick or type variables.
            </p>
            <input
              type="text"
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              placeholder="candidate_name, job_title, company_name, work_model, time_zone, start_date, annual_salary"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => router.push("/hr/recruitment/offer-templates")}
            className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold shadow-xs"
          >
            {saveMutation.isPending
              ? "Saving..."
              : mode === "edit"
                ? "Update Template"
                : "Create Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
