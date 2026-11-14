import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { formatLeaveDays } from "@/lib/leave-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  RefreshCw,
  BookOpenCheck,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leave/balance")({
  component: MeLeaveBalancePage,
});

export default function MeLeaveBalancePage() {
  const currentYear = new Date().getUTCFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");

  const {
    data: balances = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["me-leave-balance", selectedYear],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/balance", {
        params: { year: selectedYear },
      });
      return unwrapArray<any>(res);
    },
  });

  const allLedger = useMemo(() => {
    return balances
      .filter((b: any) => selectedTypeId === "all" || b.leaveTypeId === selectedTypeId)
      .flatMap((b: any) =>
        (b.ledger || []).map((l: any) => ({
          ...l,
          leaveTypeName: b.leaveTypeName || b.name,
          leaveTypeColor: b.color || "#3B82F6",
        }))
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.effectiveAt || b.createdAt).getTime() -
          new Date(a.effectiveAt || a.createdAt).getTime()
      );
  }, [balances, selectedTypeId]);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Leave Balances & Ledger"
        description="Real-time leave entitlements, used days, pending holds, and immutable ledger history."
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select balance year"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading leave balances...
        </div>
      ) : balances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No active leave entitlements configured for {selectedYear}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {balances.map((b: any) => {
            const total = Number(b.total ?? b.quota ?? 0);
            const carryForward = Number(b.carryForward ?? 0);
            const used = Number(b.used ?? 0);
            const pending = Number(b.pending ?? 0);
            const available = Number(b.available ?? 0);
            const isUnpaidZero = b.isPaid === false && total === 0;

            return (
              <Card
                key={b.leaveTypeId}
                data-testid={`ess-balance-card-${b.leaveTypeId}`}
                className="border-border/80"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: b.color || "#10B981" }}
                      />
                      <span className="font-semibold text-sm truncate">
                        {b.leaveTypeName || b.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {b.isPaid === false ? "Unpaid" : "Paid"}
                      </Badge>
                      {b.status === "inactive" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-bold tracking-tight">
                        {isUnpaidZero ? "Unpaid" : `${formatLeaveDays(available)} days`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Available Balance
                      </div>
                    </div>
                    <Coins className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Total</span>
                      <span className="font-mono font-semibold">{formatLeaveDays(total)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Carry</span>
                      <span className="font-mono font-semibold">
                        {formatLeaveDays(carryForward)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Used</span>
                      <span className="font-mono font-semibold text-amber-600">
                        {formatLeaveDays(used)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Pending</span>
                      <span className="font-mono font-semibold text-blue-600">
                        {formatLeaveDays(pending)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-primary" />
              Immutable Leave Transaction Ledger ({selectedYear})
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter ledger by leave type"
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
              >
                <option value="all">All Leave Categories</option>
                {balances.map((b: any) => (
                  <option key={b.leaveTypeId} value={b.leaveTypeId}>
                    {b.leaveTypeName || b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {allLedger.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-muted-foreground">
              No ledger transactions recorded for {selectedYear} yet.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Effective Date</th>
                      <th className="py-3 px-4 text-left">Leave Category</th>
                      <th className="py-3 px-4 text-left">Operation</th>
                      <th className="py-3 px-4 text-left">Days</th>
                      <th className="py-3 px-4 text-left">Running Balance</th>
                      <th className="py-3 px-4 text-left">Actor</th>
                      <th className="py-3 px-4 text-left">Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allLedger.map((l: any) => {
                      const isCredit =
                        l.entryType === "CREDIT" || l.entryType === "ACCRUAL";
                      return (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                            {String(l.effectiveAt || l.createdAt).slice(0, 10)}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: l.leaveTypeColor }}
                              />
                              {l.leaveTypeName}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                isCredit
                                  ? "default"
                                  : l.entryType === "DEBIT"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="font-mono text-xs"
                            >
                              {l.entryType}
                            </Badge>
                          </td>
                          <td
                            className={`py-3 px-4 font-mono font-semibold ${
                              isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatLeaveDays(l.days)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">
                            {formatLeaveDays(l.balance)} days
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {l.actorName || "System"}
                          </td>
                          <td
                            className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate"
                            title={l.notes}
                          >
                            {l.notes || "Ledger transaction"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {allLedger.map((l: any) => {
                  const isCredit =
                    l.entryType === "CREDIT" || l.entryType === "ACCRUAL";
                  return (
                    <div key={l.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{l.leaveTypeName}</span>
                        <Badge
                          variant={isCredit ? "default" : "destructive"}
                          className="font-mono text-[10px]"
                        >
                          {l.entryType} {isCredit ? "+" : "-"}
                          {formatLeaveDays(l.days)}d
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground font-mono">
                        <span>{String(l.effectiveAt || l.createdAt).slice(0, 10)}</span>
                        <span className="font-semibold text-primary">
                          Balance: {formatLeaveDays(l.balance)}d
                        </span>
                      </div>
                      <p className="text-muted-foreground break-words">
                        {l.notes || "Ledger transaction"}{" "}
                        {l.actorName ? `• By ${l.actorName}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
