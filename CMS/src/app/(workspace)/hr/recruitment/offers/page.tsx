"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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

function getInitials(name?: string | null): string {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

const AVATAR_TONES = [
  "bg-rose-500/15 text-rose-700 border-rose-500/25",
  "bg-amber-500/15 text-amber-700 border-amber-500/25",
  "bg-purple-500/15 text-purple-700 border-purple-500/25",
  "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  "bg-sky-500/15 text-sky-700 border-sky-500/25",
];

function getTone(seed?: string | null): string {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

type OfferStatus = "draft" | "sent" | "accepted" | "negotiating" | "declined" | "expired";

function normalizeOfferStatus(raw?: string | null): OfferStatus {
  const s = String(raw || "draft").toLowerCase();
  if (s === "sent" || s === "approved") return "sent";
  if (s === "accepted") return "accepted";
  if (s === "negotiating") return "negotiating";
  if (s === "declined" || s === "rejected") return "declined";
  if (s === "expired") return "expired";
  return "draft";
}

function getOfferStatusBadge(st: OfferStatus) {
  switch (st) {
    case "sent":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "accepted":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "negotiating":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "declined":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    case "expired":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function HrOffersPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | OfferStatus>("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState<OfferStatus>("draft");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    candidateId: "",
    jobPostingId: "",
    departmentId: "",
    templateId: "",
    salary: "",
    startDate: new Date().toISOString().slice(0, 10),
    expirationDate: "",
    approvedBy: "",
    benefits: "",
  });

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-offers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/offers");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-offers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/candidates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobPostings = [] } = useQuery({
    queryKey: ["hr-job-postings-offers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-postings").catch(() => []);
      return Array.isArray(res) ? res : res?.data || res?.jobs || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments-offers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/organization/departments", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-approvers"],
    queryFn: async () => {
      const res: any = await api.get("/hr/employees", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: offerTemplates = [] } = useQuery({
    queryKey: ["hr-offer-templates-picker"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/offer-templates").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.candidateId) throw new Error("Candidate is required.");
      if (!form.salary || Number(form.salary) <= 0) throw new Error("Salary must be greater than 0.");
      if (!form.startDate) throw new Error("Start Date is required.");
      if (form.expirationDate && form.startDate && form.expirationDate > form.startDate) {
        // valid: expiration can be before or after start, just ensure valid date
      }
      const payload = {
        candidateId: form.candidateId,
        jobPostingId: form.jobPostingId || null,
        departmentId: form.departmentId || null,
        templateId: form.templateId || null,
        salary: Number(form.salary),
        startDate: form.startDate,
        expirationDate: form.expirationDate || null,
        approvedBy: form.approvedBy || null,
        benefits: form.benefits.trim(),
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/offers/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/offers", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Offer updated" : "Offer created");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-offers"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save offer"),
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      return await api.put(`/hr/recruitment/offers/${statusTarget.id}`, { status: nextStatus });
    },
    onSuccess: () => {
      toast.success("Offer status updated");
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-offers"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update offer status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/offers/${id}`),
    onSuccess: () => {
      toast.success("Offer deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-offers"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete offer"),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: offers.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      negotiating: 0,
      declined: 0,
      expired: 0,
    };
    offers.forEach((o: any) => {
      const st = normalizeOfferStatus(o.status);
      c[st] = (c[st] || 0) + 1;
    });
    return c;
  }, [offers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return offers.filter((o: any) => {
      const st = normalizeOfferStatus(o.status);
      if (statusTab !== "all" && st !== statusTab) return false;
      if (candidateFilter !== "all" && o.candidateId !== candidateFilter) return false;
      if (!q) return true;
      return (
        String(o.candidate?.fullName || "").toLowerCase().includes(q) ||
        String(o.jobPosting?.title || "").toLowerCase().includes(q) ||
        String(o.department?.name || "").toLowerCase().includes(q)
      );
    });
  }, [offers, searchQuery, candidateFilter, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      candidateId: "",
      jobPostingId: "",
      departmentId: "",
      templateId: "",
      salary: "",
      startDate: new Date().toISOString().slice(0, 10),
      expirationDate: new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10),
      approvedBy: "",
      benefits: "",
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      candidateId: item.candidateId || "",
      jobPostingId: item.jobPostingId || "",
      departmentId: item.departmentId || "",
      templateId: item.templateId || "",
      salary: item.annualCtc !== undefined && item.annualCtc !== null ? String(item.annualCtc) : "",
      startDate: formatDate(item.joiningDate),
      expirationDate: formatDate(item.expiresAt) === "—" ? "" : formatDate(item.expiresAt),
      approvedBy: item.approvedBy || "",
      benefits: item.comments || "",
    });
    setModalMode("edit");
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Offers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage job offers sent to candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Create Offer
        </button>
      </div>

      {/* Filter & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-56">
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
            <select
              value={candidateFilter}
              onChange={(e) => {
                setCandidateFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[160px]"
            >
              <option value="all">All Candidates</option>
              {candidates.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCandidateFilter("all");
              setStatusTab("all");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-funnel text-sm" />
            Filters
          </button>
        </div>

        <div className="flex items-center gap-5 px-4 pt-2.5 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", icon: "ph-squares-four" },
            { key: "draft" as const, label: "Draft", icon: "ph-file-text" },
            { key: "sent" as const, label: "Sent", icon: "ph-paper-plane-tilt" },
            { key: "accepted" as const, label: "Accepted", icon: "ph-check-circle" },
            { key: "negotiating" as const, label: "Negotiating", icon: "ph-chat-text" },
            { key: "declined" as const, label: "Declined", icon: "ph-x-circle" },
            { key: "expired" as const, label: "Expired", icon: "ph-clock" },
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
                className={`inline-flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
                  {counts[tab.key] ?? 0}
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
                  Candidate
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Salary
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Start Date
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Expires
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Offer Date
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
                    <td colSpan={8} className="p-4">
                      <div className="h-10 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No job offers found. Click &ldquo;+ Create Offer&rdquo; to issue an offer.
                  </td>
                </tr>
              ) : (
                paginated.map((offer: any, idx: number) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const candName = offer.candidate?.fullName || "Candidate";
                  const posTitle = offer.jobPosting?.title || offer.designation?.name || "Open Position";
                  const st = normalizeOfferStatus(offer.status);
                  const expStr = formatDate(offer.expiresAt);
                  const isExpired = expStr !== "—" && expStr < todayIso;

                  return (
                    <tr key={offer.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${getTone(
                              candName
                            )}`}
                          >
                            {getInitials(candName)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/hr/recruitment/offers/${offer.id}`}
                              className="text-xs font-semibold text-foreground hover:text-emerald-600 block truncate"
                            >
                              {candName}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">{posTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold tabular-nums text-foreground whitespace-nowrap">
                        {formatMoney(offer.annualCtc)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(offer.joiningDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs font-medium ${isExpired ? "text-rose-600" : "text-muted-foreground"}`}>
                          <span className="inline-flex items-center gap-1.5">
                            <i className="ph ph-calendar-blank text-sm" />
                            {expStr}
                          </span>
                          {isExpired && <p className="text-[10px] font-semibold text-rose-600 mt-0.5">Expired</p>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${getOfferStatusBadge(
                            st
                          )}`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          {formatDate(offer.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hr/recruitment/offers/${offer.id}`}
                            title="View Offer Details"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </Link>
                          <button
                            type="button"
                            title="Edit Offer"
                            onClick={() => openEdit(offer)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Update Offer Status"
                            onClick={() => {
                              setStatusTarget(offer);
                              setNextStatus(st);
                            }}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
                          >
                            <i className="ph ph-arrows-clockwise text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(offer)}
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

      {/* Create / Edit Offer Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-foreground">
                {modalMode === "edit" ? "Edit Offer" : "Create Offer"}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Candidate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.candidateId}
                  onChange={(e) => setForm((p) => ({ ...p, candidateId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Candidate</option>
                  {candidates.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Position <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.jobPostingId}
                  onChange={(e) => {
                    const jId = e.target.value;
                    const job = jobPostings.find((j: any) => j.id === jId);
                    setForm((p) => ({
                      ...p,
                      jobPostingId: jId,
                      departmentId: job?.departmentId || p.departmentId,
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Position</option>
                  {jobPostings.map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCode ? `${j.jobCode} - ${j.title}` : j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Offer Template</label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Offer Template</option>
                  {offerTemplates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Salary (INR ₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.salary}
                  onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                  placeholder="45000.00"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Expiration Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Approved By <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.approvedBy}
                  onChange={(e) => setForm((p) => ({ ...p, approvedBy: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Approver</option>
                  {employees.map((e: any) => {
                    const name =
                      e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                    return (
                      <option key={e.id} value={e.id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Benefits</label>
                <textarea
                  rows={4}
                  value={form.benefits}
                  onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
                  placeholder="Comprehensive health insurance coverage, performance bonus, flexible working hours..."
                  className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Offer Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Update Offer Status</h3>
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OfferStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusTarget(null)}
                  className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {statusMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ph ph-warning text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Offer</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete the offer for{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.candidate?.fullName || "this candidate"}
                  </span>
                  ?
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
