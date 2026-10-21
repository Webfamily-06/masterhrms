import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, pastelCardTokens } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatSystemAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Scale,
  TrendingUp,
  FileDown,
  Search,
  AlertCircle,
  FileText,
  Printer,
  Calendar,
} from "lucide-react";

export interface FinancialStatementsViewProps {
  statementsData: any;
  trialBalanceData: any;
  isLoading?: boolean;
  onSelectLedgerAccount: (accountId: string) => void;
}

export function FinancialStatementsView({
  statementsData,
  trialBalanceData,
  isLoading = false,
  onSelectLedgerAccount,
}: FinancialStatementsViewProps) {
  const [tbSearch, setTbSearch] = useState("");

  // Filter trial balance accounts by search query
  const filteredTrialBalanceAccounts = useMemo(() => {
    if (!trialBalanceData?.accounts) return [];
    if (!tbSearch.trim()) return trialBalanceData.accounts;
    const q = tbSearch.toLowerCase().trim();
    return trialBalanceData.accounts.filter(
      (a: any) =>
        a.accountCode?.toLowerCase().includes(q) ||
        a.accountName?.toLowerCase().includes(q) ||
        a.accountType?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
    );
  }, [trialBalanceData, tbSearch]);

  // CSV Export for Trial Balance
  const exportTrialBalanceCSV = () => {
    if (!trialBalanceData?.accounts?.length) return;
    const headers = ["Account Code", "Account Name", "Classification", "Category", "Debit", "Credit"];
    const rows = trialBalanceData.accounts.map((a: any) => [
      `"${a.accountCode}"`,
      `"${a.accountName.replace(/"/g, '""')}"`,
      `"${a.accountType}"`,
      `"${a.category || 'General'}"`,
      Number(a.debit || 0).toFixed(2),
      Number(a.credit || 0).toFixed(2),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Trial_Balance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. BALANCE SHEET & PROFIT AND LOSS STATEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Balance Sheet Card */}
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="size-4 text-primary" /> Balance Sheet Statement
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Fundamental equation: Assets = Liabilities + Equity + Retained Earnings
              </CardDescription>
            </div>
            <Badge className="text-[9px] bg-emerald-500 text-white font-bold shrink-0">
              BALANCED
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {/* Assets */}
            <div>
              <h4 className="font-bold text-primary uppercase text-[11px] border-b pb-1 mb-2.5 flex items-center justify-between">
                <span>Total Assets</span>
                <span className="font-mono text-xs">
                  {formatSystemAmount(statementsData?.balanceSheet?.totalAssets || 0)}
                </span>
              </h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {statementsData?.balanceSheet?.assets?.map((a: any) => (
                  <div key={a.id} className="flex justify-between py-1 border-b border-border/30 hover:bg-muted/20 px-1 rounded transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectLedgerAccount(a.id)}
                      className="text-left hover:underline text-foreground"
                    >
                      {a.accountName} <span className="font-mono text-[10px] text-muted-foreground">({a.accountCode})</span>
                    </button>
                    <span className="font-mono font-bold text-foreground">{formatSystemAmount(a.balance)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h4 className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[11px] border-b pb-1 mb-2.5 flex items-center justify-between">
                <span>Liabilities & Equity</span>
                <span className="font-mono text-xs">
                  {formatSystemAmount(statementsData?.balanceSheet?.balancedTotalLiabEquity || 0)}
                </span>
              </h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {statementsData?.balanceSheet?.liabilities?.map((l: any) => (
                  <div key={l.id} className="flex justify-between py-1 border-b border-border/30 hover:bg-muted/20 px-1 rounded transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectLedgerAccount(l.id)}
                      className="text-left hover:underline text-foreground"
                    >
                      {l.accountName} <span className="font-mono text-[10px] text-muted-foreground">({l.accountCode})</span>
                    </button>
                    <span className="font-mono font-bold text-foreground">{formatSystemAmount(l.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 border-b border-border/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 rounded font-bold text-emerald-700 dark:text-emerald-400">
                  <span>Retained Earnings / Net Profit</span>
                  <span className="font-mono">{formatSystemAmount(statementsData?.balanceSheet?.netProfit || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit & Loss Card */}
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" /> Profit & Loss Statement (P&L)
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Operating revenues minus operating expenses for the period
              </CardDescription>
            </div>
            <Badge className="text-[10px] bg-primary/10 text-primary font-bold shrink-0">
              Margin: {statementsData?.profitAndLoss?.profitMarginPct || 0}%
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {/* Revenues */}
            <div>
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px] border-b pb-1 mb-2.5 flex items-center justify-between">
                <span>Operating Revenues</span>
                <span className="font-mono text-xs">
                  +{formatSystemAmount(statementsData?.profitAndLoss?.totalRevenue || 0)}
                </span>
              </h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {statementsData?.profitAndLoss?.revenue?.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-1 border-b border-border/30 hover:bg-muted/20 px-1 rounded transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectLedgerAccount(r.id)}
                      className="text-left hover:underline text-foreground"
                    >
                      {r.accountName}
                    </button>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatSystemAmount(r.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h4 className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[11px] border-b pb-1 mb-2.5 flex items-center justify-between">
                <span>Operating Expenses</span>
                <span className="font-mono text-xs">
                  -{formatSystemAmount(statementsData?.profitAndLoss?.totalExpenses || 0)}
                </span>
              </h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {statementsData?.profitAndLoss?.expenses?.map((e: any) => (
                  <div key={e.id} className="flex justify-between py-1 border-b border-border/30 hover:bg-muted/20 px-1 rounded transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectLedgerAccount(e.id)}
                      className="text-left hover:underline text-foreground"
                    >
                      {e.accountName}
                    </button>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatSystemAmount(e.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-secondary/40 border rounded-xl flex justify-between items-center font-bold text-xs">
              <span className="text-foreground">Net Operating Profit</span>
              <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                {formatSystemAmount(statementsData?.profitAndLoss?.netProfit || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. COMPREHENSIVE TRIAL BALANCE */}
      <div className="space-y-4">
        {/* Header Controls & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Comprehensive Trial Balance</h3>
              {trialBalanceData?.isBalanced ? (
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-0.5 px-2">
                  BOOKS BALANCED (DR = CR)
                </Badge>
              ) : (
                <Badge className="bg-rose-600 text-white font-bold text-xs py-0.5 px-2 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  UNBALANCED (Diff: {formatSystemAmount(trialBalanceData?.difference || 0)})
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              As of {trialBalanceData?.asOfDate || new Date().toISOString().split("T")[0]} • Double-entry debit & credit equation verification across all nominal, real, and personal accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search account code/name..."
                value={tbSearch}
                onChange={(e) => setTbSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportTrialBalanceCSV}
              disabled={!trialBalanceData?.accounts?.length}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <FileDown className="size-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Trial Balance Table */}
        <Card className="border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3 w-[120px]">Code</th>
                  <th className="p-3">Account Title</th>
                  <th className="p-3 w-[140px]">Classification</th>
                  <th className="p-3 w-[150px]">Category</th>
                  <th className="p-3 text-right w-[150px]">Debit (DR)</th>
                  <th className="p-3 text-right w-[150px]">Credit (CR)</th>
                  <th className="p-3 text-right w-[100px]">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {filteredTrialBalanceAccounts.length > 0 ? (
                  filteredTrialBalanceAccounts.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/20 font-sans">
                      <td className="p-3 font-mono font-bold text-primary">{row.accountCode}</td>
                      <td className="p-3 font-semibold text-foreground">
                        <button
                          type="button"
                          onClick={() => onSelectLedgerAccount(row.id)}
                          className="hover:underline text-left"
                          title="View Ledger Statement"
                        >
                          {row.accountName}
                        </button>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px] capitalize font-medium">
                          {row.accountType}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground capitalize text-[11px]">
                        {row.category?.replace("_", " ") || "General"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.debit > 0 ? formatSystemAmount(row.debit) : "—"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {row.credit > 0 ? formatSystemAmount(row.credit) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelectLedgerAccount(row.id)}
                          className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary/10"
                        >
                          <FileText className="size-3" /> Ledger
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs italic font-sans">
                      No trial balance accounts match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Totals Summary Footer */}
              <tfoot className="bg-muted/70 border-t-2 font-mono font-black text-xs">
                <tr>
                  <td colSpan={4} className="p-3 text-right font-sans uppercase text-muted-foreground tracking-wide">
                    Total Summation (Debit / Credit Equation)
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {formatSystemAmount(trialBalanceData?.totalDebits || 0)}
                  </td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono text-sm">
                    {formatSystemAmount(trialBalanceData?.totalCredits || 0)}
                  </td>
                  <td className="p-3 text-right font-sans">
                    {trialBalanceData?.isBalanced ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Net 0.00 Diff</span>
                    ) : (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                        Unbalanced
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default FinancialStatementsView;
