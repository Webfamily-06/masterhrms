"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REGISTERS = [
  {
    code: "FORM_W",
    name: "Form W — Register of Wages",
    subtitle: "Wage rates, gross earnings, statutory deductions & net disbursements",
    icon: "ph-currency-inr",
  },
  {
    code: "FORM_U",
    name: "Form U — Employee Master",
    subtitle: "Employee KYC, PAN, UAN, ESI & department records",
    icon: "ph-users",
  },
  {
    code: "FORM_V",
    name: "Form V — Muster Roll",
    subtitle: "Monthly working days, present days & LOP attendance ledger",
    icon: "ph-calendar-check",
  },
  {
    code: "FORM_X",
    name: "Form X — Leave & Social Security",
    subtitle: "PF/ESI coverage and social security register",
    icon: "ph-shield-check",
  },
  {
    code: "FORM_S",
    name: "Form S — Shift & Hours",
    subtitle: "Standard working days and shift compliance register",
    icon: "ph-clock",
  },
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

export default function StatutoryRegistersPage() {
  const now = new Date();
  const [selectedCode, setSelectedCode] = useState("FORM_W");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["hr-statutory-register", selectedCode, month, year],
    queryFn: async () => {
      const res = await api.get(`/api/v1/hr/payroll/statutory-registers/${selectedCode}`, {
        params: { month, year },
      });
      return res?.data ?? res ?? {};
    },
  });

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const activeMeta = REGISTERS.find((r) => r.code === selectedCode) || REGISTERS[0];

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.error("No register records to export");
      return;
    }
    const headers = [
      "Sl No",
      "Employee Code",
      "Employee Name",
      "Department",
      "PAN",
      "UAN",
      "Working Days",
      "Present Days",
      "LOP Days",
      "Gross Wages (INR)",
      "Deductions (INR)",
      "Net Wages (INR)",
      "Status",
    ];
    const csvRows = rows.map((r: any) => [
      r.slNo,
      `"${r.employeeCode}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.pan}"`,
      `"${r.uan}"`,
      r.workingDays,
      r.presentDays,
      r.lopDays,
      Number(r.grossWages || 0).toFixed(2),
      Number(r.deductions || 0).toFixed(2),
      Number(r.netWages || 0).toFixed(2),
      `"${r.status}"`,
    ]);
    const csv = [headers.join(","), ...csvRows.map((x: any) => x.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCode}_${year}_${String(month).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${activeMeta.code} exported to CSV`);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Statutory Registers</h1>
          <p className="text-sm text-muted-foreground">
            Live statutory wage, attendance, and employee compliance registers generated from Payroll Runs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Select Month"
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
            aria-label="Select Year"
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
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await api.download(
                  `/api/v1/hr/payroll/statutory-registers/${selectedCode}/export?month=${month}&year=${year}`,
                  `${selectedCode}_${year}_${String(month).padStart(2, "0")}.xlsx`
                );
                toast.success(`${activeMeta.code} Legal Excel downloaded`);
              } catch (err: any) {
                toast.error(err?.message || "Failed to download Legal Excel");
              }
            }}
            className="h-9 gap-1.5"
          >
            <i className="ph ph-file-xls text-base text-emerald-600" />
            <span>Legal Excel</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="ph ph-download-simple text-base" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Register Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {REGISTERS.map((reg) => {
          const active = selectedCode === reg.code;
          return (
            <button
              key={reg.code}
              type="button"
              onClick={() => setSelectedCode(reg.code)}
              className={`rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? "border-emerald-600 bg-emerald-500/10"
                  : "border-border/80 bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <i
                  className={`ph ${reg.icon} text-lg ${
                    active ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                />
                <span className="text-xs font-bold text-foreground">{reg.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                {reg.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Register Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">{activeMeta.name}</h2>
            <p className="text-xs text-muted-foreground">
              Period: {SHORT_MONTHS[month - 1]} {year} • {rows.length} employee(s)
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            Live DB Register
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3 px-3 w-12">#</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">PAN / UAN</th>
                <th className="py-3 px-3 text-center">Present / LOP</th>
                <th className="py-3 px-3 text-right">Gross Wages</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Net Wages</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading register data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    No active employees found for this period.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr key={row.slNo} className="hover:bg-muted/30">
                    <td className="py-3 px-3 text-muted-foreground">{row.slNo}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground">{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{row.department}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      <div>PAN: {row.pan}</div>
                      <div>UAN: {row.uan}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-xs">
                      <span className="font-semibold text-emerald-600">{row.presentDays}</span> /{" "}
                      <span className="font-semibold text-rose-600">{row.lopDays}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium whitespace-nowrap">
                      {formatINR(row.grossWages)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-rose-600 whitespace-nowrap">
                      {formatINR(row.deductions)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {formatINR(row.netWages)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          row.status === "Computed"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
