"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getCurrentFinancialYear, getSelectableFinancialYears } from "@/lib/financial-year";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

export default function HrPayrollTaxPage() {
  const queryClient = useQueryClient();
  const [selectedFy, setSelectedFy] = useState(getCurrentFinancialYear());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    regime: "new",
    section80c: "0",
    section80d: "0",
    hraExemption: "0",
    otherExemptions: "0",
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const { data: declarations = [], isLoading } = useQuery<any[]>({
    queryKey: ["hr-tax-declarations", selectedFy],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/tax/declarations", {
        params: { financialYear: selectedFy },
      });
      const payload = res?.data ?? res ?? {};
      return Array.isArray(payload.declarations) ? payload.declarations : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/api/v1/hr/payroll/tax/declarations", {
        employeeId: form.employeeId,
        financialYear: selectedFy,
        regime: form.regime,
        section80c: Number(form.section80c) || 0,
        section80d: Number(form.section80d) || 0,
        hraExemption: Number(form.hraExemption) || 0,
        otherExemptions: Number(form.otherExemptions) || 0,
      }),
    onSuccess: () => {
      toast.success("Tax declaration saved");
      setModalOpen(false);
      setForm({
        employeeId: "",
        regime: "new",
        section80c: "0",
        section80d: "0",
        hraExemption: "0",
        otherExemptions: "0",
      });
      queryClient.invalidateQueries({ queryKey: ["hr-tax-declarations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save declaration"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/hr/payroll/tax/declarations/${id}`, { status }),
    onSuccess: () => {
      toast.success("Declaration status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-tax-declarations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update declaration"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/tax/declarations/${id}`),
    onSuccess: () => {
      toast.success("Declaration deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-tax-declarations"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete declaration"),
  });

  const q = search.trim().toLowerCase();
  const filtered = declarations.filter((d: any) => {
    if (!q) return true;
    const name = `${d.employee?.firstName || ""} ${d.employee?.lastName || ""}`.toLowerCase();
    return name.includes(q) || String(d.regime || "").toLowerCase().includes(q);
  });

  const verifiedCount = declarations.filter((d) => d.status === "verified" || d.status === "approved").length;
  const totalDeclared = declarations.reduce((s, d) => s + Number(d.totalDeclared || 0), 0);
  const totalApproved = declarations.reduce((s, d) => s + Number(d.totalApproved || 0), 0);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Tax Declarations &amp; TDS
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify Section 80C, 80D, HRA exemptions, and Old vs New Tax Regime preferences before Payroll Runs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFy}
            onChange={(e) => setSelectedFy(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Financial Year"
          >
            {getSelectableFinancialYears().map((fy) => (
              <option key={fy.value} value={fy.value}>
                {fy.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-plus text-base" />
            <span>Add Declaration</span>
          </Button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Total Declarations</div>
            <div className="text-2xl font-bold text-foreground mt-1">{declarations.length}</div>
            <div className="text-xs text-emerald-600 mt-1">{verifiedCount} verified</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
            <i className="ph ph-file-text text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Total Declared Exemptions</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatINR(totalDeclared)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">FY {selectedFy}</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
            <i className="ph ph-percent text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Approved Exemptions</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatINR(totalApproved)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">Applied to TDS computation</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <i className="ph ph-seal-check text-xl" />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/70">
          <div className="relative w-full sm:w-72">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee or regime..."
              className="pl-9 h-9 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Financial Year</th>
                <th className="py-3 px-3">Tax Regime</th>
                <th className="py-3 px-3 text-right">Declared</th>
                <th className="py-3 px-3 text-right">Approved</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading tax declarations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    No tax declarations submitted for FY {selectedFy}.
                  </td>
                </tr>
              ) : (
                filtered.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {d.employee
                        ? `${d.employee.firstName} ${d.employee.lastName}`
                        : "Employee"}
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">FY {d.financialYear}</td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-sky-500/10 text-sky-700 border-sky-500/20 capitalize">
                        {d.regime || "new"} Regime
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium">
                      {formatINR(Number(d.totalDeclared || 0))}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">
                      {formatINR(Number(d.totalApproved || 0))}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                          d.status === "verified" || d.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : d.status === "rejected"
                            ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        }`}
                      >
                        {d.status || "submitted"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Verify & Approve"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: d.id, status: "verified" })
                          }
                          className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <i className="ph ph-check-circle text-base" />
                        </button>
                        <button
                          type="button"
                          title="Reject"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: d.id, status: "rejected" })
                          }
                          className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                        >
                          <i className="ph ph-x-circle text-base" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => deleteMutation.mutate(d.id)}
                          className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <i className="ph ph-trash text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Declaration Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Tax Declaration</DialogTitle>
            <DialogDescription>FY {selectedFy} investment &amp; regime declaration.</DialogDescription>
          </DialogHeader>
          <form
            id="tax-decl-form"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-3.5 py-1"
          >
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {`${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tax Regime *</Label>
              <select
                value={form.regime}
                onChange={(e) => setForm({ ...form, regime: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="new">New Tax Regime (Default)</option>
                <option value="old">Old Tax Regime (With Exemptions)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Section 80C (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.section80c}
                  onChange={(e) => setForm({ ...form, section80c: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section 80D (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.section80d}
                  onChange={(e) => setForm({ ...form, section80d: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>HRA Exemption (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.hraExemption}
                  onChange={(e) => setForm({ ...form, hraExemption: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Other Exemptions (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.otherExemptions}
                  onChange={(e) => setForm({ ...form, otherExemptions: e.target.value })}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="tax-decl-form"
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
