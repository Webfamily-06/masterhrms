"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CountrySelect } from "@/components/ui/country-select";
import { getStatesByCountry } from "@/lib/address/india-states";

function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function formatAddress(loc: any): string {
  if (loc.isRemote) return "Remote Work";
  if (loc.address && loc.address.trim()) return loc.address.trim();
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export default function HrJobLocationsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<"name" | "createdAt" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    locationType: "",
    isRemote: false,
    address: "",
    city: "",
    state: "",
    country: "India",
    isActive: true,
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["hr-recruitment-job-locations"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-locations");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobTypes = [] } = useQuery({
    queryKey: ["hr-recruitment-job-types"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-types").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const activeJobTypes = useMemo(
    () => jobTypes.filter((t: any) => t?.isActive !== false),
    [jobTypes]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Location name is required.");
      if (!form.locationType.trim()) throw new Error("Type is required.");
      const isRemoteVal = form.locationType.toLowerCase().includes("remote");
      const payload = {
        name: form.name.trim(),
        locationType: form.locationType.trim(),
        isRemote: isRemoteVal,
        address: isRemoteVal ? null : form.address.trim() || null,
        city: isRemoteVal ? null : form.city.trim() || null,
        state: isRemoteVal ? null : form.state.trim() || null,
        country: form.country.trim() || "India",
        isActive: form.isActive,
      };
      if (modalMode === "edit" && editingItem?.id) {
        return await api.put(`/hr/recruitment/job-locations/${editingItem.id}`, payload);
      }
      return await api.post("/hr/recruitment/job-locations", payload);
    },
    onSuccess: () => {
      toast.success(modalMode === "edit" ? "Job location updated" : "Job location added");
      setModalMode(null);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-locations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save location"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: any) =>
      api.put(`/hr/recruitment/job-locations/${item.id}`, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-locations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/recruitment/job-locations/${id}`),
    onSuccess: () => {
      toast.success("Job location deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-recruitment-job-locations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete location"),
  });

  const counts = useMemo(() => {
    const all = locations.length;
    const active = locations.filter((l: any) => l.isActive !== false).length;
    const inactive = all - active;
    return { all, active, inactive };
  }, [locations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = locations.filter((l: any) => {
      const active = l.isActive !== false;
      if (statusTab === "active" && !active) return false;
      if (statusTab === "inactive" && active) return false;
      const locType = String(l.locationType || (l.isRemote ? "Remote" : "On-site"));
      if (typeFilter !== "all" && locType.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        String(l.name || "").toLowerCase().includes(q) ||
        formatAddress(l).toLowerCase().includes(q)
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
  }, [locations, searchQuery, typeFilter, statusTab, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const openCreate = () => {
    setEditingItem(null);
    const defaultType = activeJobTypes[0]?.name || "";
    setForm({
      name: "",
      locationType: defaultType,
      isRemote: defaultType.toLowerCase().includes("remote"),
      address: "",
      city: "",
      state: "",
      country: "India",
      isActive: true,
    });
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    const locType = item.locationType || (item.isRemote ? "Remote" : "On-site");
    setForm({
      name: item.name || "",
      locationType: locType,
      isRemote: Boolean(item.isRemote),
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      country: item.country || "India",
      isActive: item.isActive !== false,
    });
    setModalMode("edit");
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
          <h1 className="text-xl font-bold tracking-tight text-foreground">Job Locations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage job locations where positions are available.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
        >
          <i className="ph-bold ph-plus text-sm" />
          Add Job Location
        </button>
      </div>

      {/* Filter & Tabs Card */}
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
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500 min-w-[140px]"
            >
              <option value="all">All Types</option>
              {activeJobTypes.map((t: any) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setStatusTab("all");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/60"
          >
            <i className="ph ph-funnel text-sm" />
            Filters
          </button>
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
                  Address
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
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
                    No job locations found. Click &ldquo;+ Add Job Location&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((loc: any, idx: number) => {
                  const active = loc.isActive !== false;
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={loc.id} className="hover:bg-muted/35 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-semibold text-muted-foreground">{rowNum}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground">{loc.name}</td>
                      <td className="py-3.5 px-4 text-xs">
                        {loc.isRemote ? (
                          <span className="font-medium text-blue-600">Remote Work</span>
                        ) : (
                          <span className="text-foreground">{formatAddress(loc)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {(() => {
                          const label = loc.locationType || (loc.isRemote ? "Remote" : "On-site");
                          const isRem = label.toLowerCase().includes("remote") || loc.isRemote;
                          return (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${
                                isRem
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })()}
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
                          {formatDate(loc.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewItem(loc)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <i className="ph ph-eye text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(loc)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10"
                          >
                            <i className="ph ph-pencil-simple-line text-[15px]" />
                          </button>
                          <button
                            type="button"
                            title={active ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatusMutation.mutate(loc)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10"
                          >
                            <i className={`ph ${active ? "ph-lock-simple" : "ph-lock-simple-open"} text-[15px]`} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(loc)}
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

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {modalMode === "edit" ? "Edit Job Location" : "Add New Job Location"}
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
              className="p-5 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Location Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Tech Hub - Bangalore"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.locationType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({
                        ...p,
                        locationType: val,
                        isRemote: val.toLowerCase().includes("remote"),
                      }));
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  >
                    <option value="">
                      {activeJobTypes.length === 0 ? "No Job Types found" : "Select Job Type"}
                    </option>
                    {activeJobTypes.map((t: any) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                    {form.locationType && !activeJobTypes.some((t: any) => t.name === form.locationType) && (
                      <option value={form.locationType}>{form.locationType}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.isActive ? "active" : "inactive"}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {!form.isRemote && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Address</label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Full street address, building, area..."
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Country</label>
                      <CountrySelect
                        value={form.country}
                        onValueChange={(val) =>
                          setForm((p) => ({
                            ...p,
                            country: val,
                            state: p.country !== val ? "" : p.state,
                          }))
                        }
                        placeholder="Select country..."
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">State</label>
                      {getStatesByCountry(form.country).length > 0 ? (
                        <select
                          value={form.state}
                          onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                        >
                          <option value="">Select State</option>
                          {getStatesByCountry(form.country).map((st) => (
                            <option key={st.code} value={st.name}>
                              {st.name}
                            </option>
                          ))}
                          {form.state &&
                            !getStatesByCountry(form.country).some(
                              (st) => st.name.toLowerCase() === form.state.toLowerCase()
                            ) && <option value={form.state}>{form.state}</option>}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                          placeholder="State / Province"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Bangalore"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

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

      {/* View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <i className="ph ph-map-pin text-base" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Job Location Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Location Name</p>
                <p className="font-bold text-foreground">{viewItem.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Type</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 font-semibold">
                  {viewItem.locationType || (viewItem.isRemote ? "Remote" : "On-site")}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Address</p>
                <p className="font-medium text-foreground">{formatAddress(viewItem)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                  {viewItem.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Created At</p>
                <p className="font-medium text-foreground">{formatDate(viewItem.createdAt)}</p>
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
                <h3 className="text-sm font-bold text-foreground">Delete Job Location</h3>
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
