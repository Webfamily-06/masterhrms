"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AssetTypeOption {
  id: string;
  name: string;
}

interface DepreciationRow {
  id: string;
  name: string;
  assetTag: string;
  categoryId?: string | null;
  categoryName: string;
  imageUrl?: string | null;
  purchaseDate?: string | null;
  purchaseCost: number;
  depreciationMethod: string;
  depreciationMethodLabel: string;
  currentValue: number;
  depreciation: number;
  depreciationPercent: number;
}

interface DepreciationReportResponse {
  summary: {
    totalPurchaseValue: number;
    totalCurrentValue: number;
    totalDepreciation: number;
    currentValuePercent: number;
    depreciationPercent: number;
    assetCount: number;
  };
  assets: DepreciationRow[];
}

type SortKey =
  | "name"
  | "purchaseDate"
  | "purchaseCost"
  | "currentValue"
  | "depreciation"
  | "depreciationPercent";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDateISO = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

export default function HrAssetDepreciationReportPage() {
  const [categoryId, setCategoryId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    categoryId: "all",
    dateFrom: "",
    dateTo: "",
  });

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const { data: assetTypes = [] } = useQuery<AssetTypeOption[]>({
    queryKey: ["hr-asset-types-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
  });

  const { data: report, isLoading } = useQuery<DepreciationReportResponse>({
    queryKey: ["hr-asset-depreciation-report", appliedFilters],
    queryFn: async () => {
      const res = await api.get("/hr/assets/depreciation/report", {
        params: {
          ...(appliedFilters.categoryId !== "all" ? { categoryId: appliedFilters.categoryId } : {}),
          ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
          ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      return {
        summary: payload.summary ?? {
          totalPurchaseValue: 0,
          totalCurrentValue: 0,
          totalDepreciation: 0,
          currentValuePercent: 0,
          depreciationPercent: 0,
          assetCount: 0,
        },
        assets: Array.isArray(payload.assets) ? payload.assets : [],
      };
    },
  });

  const sortedAssets = useMemo(() => {
    const list = [...(report?.assets ?? [])];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (sortKey === "purchaseDate") {
        cmp =
          (a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0) -
          (b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0);
      } else {
        cmp = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [report?.assets, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ categoryId, dateFrom, dateTo });
  };

  const handleResetFilters = () => {
    setCategoryId("all");
    setDateFrom("");
    setDateTo("");
    setAppliedFilters({ categoryId: "all", dateFrom: "", dateTo: "" });
  };

  const handleExportCsv = () => {
    if (!sortedAssets.length) {
      toast.error("No depreciation records available to export");
      return;
    }
    const headers = [
      "#",
      "Asset Name",
      "Asset Type",
      "Asset Code",
      "Purchase Date",
      "Purchase Cost (INR)",
      "Depreciation Method",
      "Current Value (INR)",
      "Depreciation (INR)",
      "Depreciation %",
    ];
    const rows = sortedAssets.map((row, idx) => [
      idx + 1,
      `"${(row.name || "").replace(/"/g, '""')}"`,
      `"${(row.categoryName || "").replace(/"/g, '""')}"`,
      `"${(row.assetTag || "").replace(/"/g, '""')}"`,
      formatDateISO(row.purchaseDate),
      row.purchaseCost.toFixed(2),
      `"${row.depreciationMethodLabel}"`,
      row.currentValue.toFixed(2),
      row.depreciation.toFixed(2),
      `${row.depreciationPercent.toFixed(2)}%`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asset-depreciation-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Depreciation report exported to CSV");
  };

  const summary = report?.summary ?? {
    totalPurchaseValue: 0,
    totalCurrentValue: 0,
    totalDepreciation: 0,
    currentValuePercent: 0,
    depreciationPercent: 0,
    assetCount: 0,
  };

  const hasActiveFilter =
    appliedFilters.categoryId !== "all" ||
    Boolean(appliedFilters.dateFrom) ||
    Boolean(appliedFilters.dateTo);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Asset Depreciation Report
          </h1>
          <p className="text-sm text-muted-foreground">
            View depreciation schedules and current value of assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Link href="/hr/assets">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <i className="ph ph-list-bullets text-base" />
              <span>Asset List</span>
            </Button>
          </Link>
          <Link href="/asset-dashboard">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <i className="ph ph-chart-bar text-base" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => typeof window !== "undefined" && window.print()}
          >
            <i className="ph ph-printer text-base" />
            <span>Print</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleExportCsv}
          >
            <i className="ph ph-download-simple text-base" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Main White Container Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 lg:p-5 space-y-5">
        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Purchase Value */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Total Purchase Value</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">
                {formatINR(summary.totalPurchaseValue)}
              </p>
              <p className="text-xs text-primary mt-1.5">Original cost of all assets</p>
            </div>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
              <i className="ph ph-shopping-cart text-xl" />
            </div>
          </div>

          {/* Total Current Value */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Total Current Value</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">
                {formatINR(summary.totalCurrentValue)}
              </p>
              <p className="text-xs text-emerald-600 mt-1.5">
                {summary.currentValuePercent}% of purchase value
              </p>
            </div>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <i className="ph ph-currency-inr text-xl" />
            </div>
          </div>

          {/* Total Depreciation */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Total Depreciation</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1 truncate">
                {formatINR(summary.totalDepreciation)}
              </p>
              <p className="text-xs text-rose-600 mt-1.5">
                {summary.depreciationPercent}% of purchase value
              </p>
            </div>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center">
              <i className="ph ph-trend-down text-xl" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by asset type"
            >
              <option value="all">All Types</option>
              {assetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-full"
              aria-label="Purchase Date From"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-full"
              aria-label="Purchase Date To"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 flex-1 sm:flex-none"
              onClick={handleApplyFilters}
            >
              <i className="ph ph-funnel text-base" />
              <span>Filters</span>
            </Button>
            {hasActiveFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Asset Depreciation Details</h2>

          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-3 w-12">#</th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Asset Name</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort("purchaseDate")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Purchase Date</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort("purchaseCost")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Purchase Cost</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Depreciation Method</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort("currentValue")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Current Value</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort("depreciation")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Depreciation</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort("depreciationPercent")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Depreciation %</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                      Calculating live depreciation schedules...
                    </td>
                  </tr>
                ) : sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <i className="ph ph-trend-down text-3xl block mx-auto mb-2 opacity-50" />
                      No assets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  sortedAssets.map((row, index) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 text-muted-foreground font-medium">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/hr/assets/${row.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-full border border-border/80 bg-muted/40 overflow-hidden flex items-center justify-center">
                            {row.imageUrl ? (
                              <img
                                src={row.imageUrl}
                                alt={row.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <i className="ph ph-cube text-base text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {row.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {row.categoryName}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          <span>{formatDateISO(row.purchaseDate)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                        {formatINR(row.purchaseCost)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-foreground">
                        {row.depreciationMethodLabel}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                        {formatINR(row.currentValue)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                        {formatINR(row.depreciation)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                        {row.depreciationPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
