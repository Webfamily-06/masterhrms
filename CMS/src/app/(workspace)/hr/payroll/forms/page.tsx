"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HrPayrollFormsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null);

  const { data: formsData, isLoading, refetch } = useQuery<any>({
    queryKey: ["hr-payroll-forms-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/forms/summary");
      return res?.data ?? res ?? {};
    },
  });

  const statutoryForms = Array.isArray(formsData?.statutoryForms) ? formsData.statutoryForms : [];
  const metrics = formsData?.metrics ?? {
    runsCount: 0,
    payslipsCount: 0,
    employeesCount: 0,
    declarationsCount: 0,
  };

  const handleDownloadForm = async (code: string) => {
    try {
      setDownloadingCode(code);
      const fileName = `${code}_${year}_${String(month).padStart(2, "0")}.xlsx`;
      await api.download(
        `/api/v1/hr/payroll/forms/${code}/download?year=${year}&month=${month}`,
        fileName
      );
      toast.success(`${code} downloaded (Excel in INR)`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to download ${code}`);
    } finally {
      setDownloadingCode(null);
    }
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Statutory Forms &amp; Returns
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and download Form 16, Form 24Q, EPF ECR, ESIC, and Professional Tax returns from live Payroll Runs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Month"
          >
            {SHORT_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Year"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 gap-1.5">
            <i className="ph ph-arrows-clockwise text-base" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Statutory Forms</div>
            <div className="text-2xl font-bold text-foreground mt-1">{statutoryForms.length}</div>
            <div className="text-xs text-emerald-600 mt-1">Ready for export</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <i className="ph ph-file-text text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Payroll Runs</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics.runsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.payslipsCount} payslips generated
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
            <i className="ph ph-calculator text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Active Employees</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics.employeesCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Covered under compliance</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center">
            <i className="ph ph-users text-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Tax Declarations</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {metrics.declarationsCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Synced with Form 16 / 24Q</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
            <i className="ph ph-seal-check text-xl" />
          </div>
        </div>
      </div>

      {/* Forms Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-muted-foreground">
            Loading statutory forms...
          </div>
        ) : (
          statutoryForms.map((form: any) => (
            <div
              key={form.code}
              className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-border/80 bg-muted/40 text-foreground">
                    {form.code}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                    {form.frequency || "Monthly"} • Ready
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground">{form.title}</h2>
                <p className="text-xs text-muted-foreground">{form.act}</p>
              </div>

              <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Live INR return for {SHORT_MONTHS[month - 1]} {year}
                </span>
                <Button
                  size="sm"
                  disabled={downloadingCode === form.code}
                  onClick={() => handleDownloadForm(form.code)}
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <i className="ph ph-file-xls text-sm" />
                  <span>{downloadingCode === form.code ? "Downloading..." : "Download Excel"}</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
