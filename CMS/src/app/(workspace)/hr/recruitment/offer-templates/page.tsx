"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { parseVariablesFromContent } from "./_components/offer-template-form";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function formatVarLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripHtml(html?: string | null): string {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatCurrency(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Generates a valid, multi-page downloadable PDF 1.4 binary directly in the browser
 * with zero external dependencies and clean word-wrapping.
 */
function buildOfferPdfBlob(title: string, bodyText: string): Blob {
  const escapePdf = (s: string) =>
    s
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const maxChars = 84;
  const wrappedLines: string[] = [];
  for (const rawLine of bodyText.replace(/\r\n/g, "\n").split("\n")) {
    if (!rawLine.trim()) {
      wrappedLines.push("");
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length <= maxChars) {
        current = (current + " " + w).trim();
      } else {
        if (current) wrappedLines.push(current);
        current = w;
      }
    }
    if (current) wrappedLines.push(current);
  }

  const linesPerPage = 44;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(1, wrappedLines.length); i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }

  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObj("");
  const pagesId = addObj("");
  const fontRegularId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds: number[] = [];
  pages.forEach((pageLines, pageIdx) => {
    const cmds: string[] = [];
    let y = 760;
    if (pageIdx === 0) {
      cmds.push(`BT /F2 15 Tf 50 ${y} Td (${escapePdf(title)}) Tj ET`);
      y -= 26;
      cmds.push(`0.85 w 50 ${y + 10} m 545 ${y + 10} l S`);
      y -= 10;
    }
    cmds.push("BT /F1 10.5 Tf 15 TL");
    cmds.push(`50 ${y} Td`);
    pageLines.forEach((line, idx) => {
      if (idx === 0) cmds.push(`(${escapePdf(line)}) Tj`);
      else cmds.push(`T* (${escapePdf(line)}) Tj`);
    });
    cmds.push("ET");

    const stream = cmds.join("\n");
    const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function HrOfferTemplatesPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<"name" | "createdAt" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [previewItem, setPreviewItem] = useState<any>(null);
  const [generateItem, setGenerateItem] = useState<any>(null);
  const [generateValues, setGenerateValues] = useState<Record<string, string>>({});
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["hr-offer-templates"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/offer-templates");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Live application data for auto-filling offer variables
  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-recruitment-candidates-autofill"],
    enabled: Boolean(generateItem),
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobPostings = [] } = useQuery({
    queryKey: ["hr-job-postings-autofill"],
    enabled: Boolean(generateItem),
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-postings").catch(() => []);
      return Array.isArray(res) ? res : res?.data || res?.jobs || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-autofill"],
    enabled: Boolean(generateItem),
    queryFn: async () => {
      const res: any = await api.get("/hr/employees", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) =>
      api.put(`/hr/recruitment/offer-templates/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success("Template status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-offer-templates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/offer-templates/${id}`),
    onSuccess: () => {
      toast.success("Offer template deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-offer-templates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete template"),
  });

  const counts = useMemo(() => {
    const all = templates.length;
    const active = templates.filter((t: any) => t.isActive !== false).length;
    return { all, active, inactive: all - active };
  }, [templates]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = templates.filter((t: any) => {
      const active = t.isActive !== false;
      if (statusTab === "active" && !active) return false;
      if (statusTab === "inactive" && active) return false;
      if (!q) return true;
      return (
        String(t.name || "").toLowerCase().includes(q) ||
        String(t.bodyHtml || "").toLowerCase().includes(q)
      );
    });
    if (sortField) {
      list = [...list].sort((a: any, b: any) => {
        const av = sortField === "name" ? String(a.name || "") : String(a.createdAt || "");
        const bv = sortField === "name" ? String(b.name || "") : String(b.createdAt || "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [templates, searchQuery, statusTab, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openGenerateModal = (item: any) => {
    const vars: string[] =
      Array.isArray(item.variables) && item.variables.length > 0
        ? item.variables
        : parseVariablesFromContent(item.bodyHtml || "");
    const companyName = profile?.tenant?.name || "";
    const timeZone = profile?.tenant?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const defaultAcceptDate = new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10);

    const initial: Record<string, string> = {};
    vars.forEach((v) => {
      if (v === "company_name") initial[v] = companyName;
      else if (v === "time_zone") initial[v] = timeZone;
      else if (v === "acceptance_date" || v === "offer_expiry_date") initial[v] = defaultAcceptDate;
      else initial[v] = "";
    });
    setSelectedCandidateId("");
    setSelectedJobId("");
    setSelectedManagerId("");
    setGenerateValues(initial);
    setGenerateItem({ ...item, _vars: vars });
  };

  const applyJobToValues = (job: any, prev: Record<string, string>) => {
    if (!job) return prev;
    const next = { ...prev };
    const setIfPresent = (key: string, val: string) => {
      if (key in next && val) next[key] = val;
    };
    setIfPresent("job_title", job.title || "");
    setIfPresent("work_model", job.type?.name || job.employmentType || "");
    setIfPresent("location", job.jobLocation?.name || job.location || "");
    setIfPresent("department", job.department?.name || "");
    setIfPresent("team_name", job.department?.name || "");
    const salaryStr = job.salaryMax
      ? formatCurrency(job.salaryMax)
      : job.salaryMin
        ? formatCurrency(job.salaryMin)
        : "";
    setIfPresent("annual_salary", salaryStr);
    setIfPresent("salary", salaryStr);
    const benefitsText = stripHtml(job.benefits);
    setIfPresent("benefits", benefitsText);
    setIfPresent("health_benefits", benefitsText);
    if (job.startDate) setIfPresent("start_date", formatDate(job.startDate));
    return next;
  };

  const handlePickCandidate = (candId: string) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c: any) => c.id === candId);
    if (!cand) return;
    const fullName =
      cand.fullName ||
      [cand.firstName, cand.lastName].filter(Boolean).join(" ") ||
      cand.name ||
      "";
    setGenerateValues((prev) => {
      let next = { ...prev };
      if ("candidate_name" in next && fullName) next.candidate_name = fullName;
      if ("candidate_email" in next && cand.email) next.candidate_email = cand.email;
      const linkedJob = cand.jobPostingId
        ? jobPostings.find((j: any) => j.id === cand.jobPostingId)
        : null;
      if (linkedJob) {
        setSelectedJobId(linkedJob.id);
        next = applyJobToValues(linkedJob, next);
      }
      return next;
    });
    toast.success(`Mapped candidate data for ${fullName || "selected candidate"}`);
  };

  const handlePickJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobPostings.find((j: any) => j.id === jobId);
    if (!job) return;
    setGenerateValues((prev) => applyJobToValues(job, prev));
    toast.success(`Mapped job posting data for ${job.title}`);
  };

  const handlePickManager = (empId: string) => {
    setSelectedManagerId(empId);
    const emp = employees.find((e: any) => e.id === empId);
    if (!emp) return;
    const fullName =
      emp.fullName ||
      [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
      emp.name ||
      "";
    setGenerateValues((prev) => {
      const next = { ...prev };
      if ("hiring_manager_name" in next) next.hiring_manager_name = fullName;
      if ("manager_name" in next) next.manager_name = fullName;
      if ("hr_manager_name" in next) next.hr_manager_name = fullName;
      return next;
    });
    toast.success(`Mapped manager ${fullName}`);
  };

  const handleGeneratePdf = () => {
    if (!generateItem) return;
    let rendered = String(generateItem.bodyHtml || "");
    for (const [key, val] of Object.entries(generateValues)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "g"), val || `[${key}]`);
    }
    const blob = buildOfferPdfBlob(generateItem.name || "Offer Letter", rendered);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = String(generateItem.name || "offer-letter")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    a.download = `${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Offer PDF generated and downloaded");
    setGenerateItem(null);
  };

  const toggleSort = (field: "name" | "createdAt") => {
    if (sortField === field) setSortAsc((p) => !p);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Offer Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage reusable templates for job offer letters.
          </p>
        </div>
        <Link
          href="/hr/recruitment/offer-templates/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Add Template
        </Link>
      </div>

      {/* Filter & Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70">
          <div className="relative max-w-xs">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-5 px-4 pt-2.5">
          {[
            { key: "all" as const, label: "All", icon: "ph-squares-four", count: counts.all },
            { key: "active" as const, label: "Active", icon: "ph-check-circle", count: counts.active },
            { key: "inactive" as const, label: "Inactive", icon: "ph-x-circle", count: counts.inactive },
          ].map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key);
                  setPage(1);
                }}
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
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Name <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Content Preview
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Variables
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Created At <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-4">
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No offer templates found. Click &ldquo;+ Add Template&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((tpl: any, idx: number) => {
                  const active = tpl.isActive !== false;
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const vars: string[] =
                    Array.isArray(tpl.variables) && tpl.variables.length > 0
                      ? tpl.variables
                      : parseVariablesFromContent(tpl.bodyHtml || "");
                  const previewText = String(tpl.bodyHtml || "").replace(/\s+/g, " ").trim();

                  return (
                    <tr key={tpl.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                        <Link
                          href={`/hr/recruitment/offer-templates/${tpl.id}`}
                          className="hover:text-emerald-600 transition-colors"
                        >
                          {tpl.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-[230px] truncate">
                        {previewText || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {vars.slice(0, 3).map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px] font-medium"
                            >
                              {v}
                            </span>
                          ))}
                          {vars.length > 3 && (
                            <span className="text-[11px] text-muted-foreground font-medium ml-0.5">
                              +{vars.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[11px] font-semibold">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(tpl.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/hr/recruitment/offer-templates/${tpl.id}`}
                            title="View Offer Template"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </Link>
                          <button
                            type="button"
                            title="Quick Preview"
                            onClick={() => setPreviewItem({ ...tpl, _vars: vars })}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
                          >
                            <i className="ph ph-file-text text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Generate Offer PDF"
                            onClick={() => openGenerateModal(tpl)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <i className="ph ph-download-simple text-[15px]" />
                          </button>
                          <Link
                            href={`/hr/recruitment/offer-templates/${tpl.id}/edit`}
                            title="Edit Offer Template"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </Link>
                          <button
                            type="button"
                            title={active ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatusMutation.mutate(tpl)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10"
                          >
                            <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(tpl)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10"
                          >
                            <i className="ph ph-trash text-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1} to{" "}
            {Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length} results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60"
              >
                &laquo; Previous
              </button>
              <span className="h-7 min-w-[28px] px-2 inline-flex items-center justify-center rounded bg-emerald-600 text-white font-semibold">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 rounded border border-border disabled:opacity-40 hover:bg-muted/60"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground">
                Template Preview: {previewItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-sm" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-5 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {previewItem.bodyHtml}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">Available Variables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(previewItem._vars || []).map((v: string) => (
                    <span
                      key={v}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px] font-medium"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Offer PDF Modal with Live Application Auto-Fill Pickers */}
      {generateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-file-arrow-down text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Generate Offer</h3>
                  <p className="text-xs text-muted-foreground">{generateItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGenerateItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Quick Auto-Fill from Live Application Data */}
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <i className="ph ph-magic-wand text-emerald-600 text-sm" />
                  <span className="text-xs font-bold text-foreground">
                    Auto-Fill from Application Data
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Pick Candidate</label>
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => handlePickCandidate(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Candidate</option>
                      {candidates.map((c: any) => {
                        const label =
                          c.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
                        return (
                          <option key={c.id} value={c.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Pick Job Posting</label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => handlePickJob(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Job</option>
                      {jobPostings.map((j: any) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Hiring / HR Manager</label>
                    <select
                      value={selectedManagerId}
                      onChange={(e) => handlePickManager(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Manager</option>
                      {employees.map((e: any) => {
                        const label =
                          e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                        return (
                          <option key={e.id} value={e.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Fill in or review the values for the template variables below.
              </p>

              {(generateItem._vars || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  This template has no dynamic variables. Click Generate PDF to download as-is.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(generateItem._vars || []).map((v: string) => (
                    <div key={v} className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">{formatVarLabel(v)}</label>
                      <input
                        type="text"
                        value={generateValues[v] || ""}
                        onChange={(e) =>
                          setGenerateValues((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        placeholder={`Enter ${formatVarLabel(v).toLowerCase()}`}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-border/70 flex items-center justify-end gap-2 shrink-0 bg-card">
              <button
                type="button"
                onClick={() => setGenerateItem(null)}
                className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <i className="ph ph-file-arrow-down text-sm" />
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ph ph-warning text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Offer Template</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.name}</span>?
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
