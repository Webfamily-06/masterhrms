import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  RefreshCw,
  BookOpenCheck,
  Scale,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leave/balance")({
  component: MeLeaveBalancePage,
});

export default function MeLeaveBalancePage() {
  const { data: balances = [], isLoading, refetch } = useQuery({
    queryKey: ["me-leave-balance"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/balance");
      return res.data;
    },
  });

  // Flatten all ledger entries
  const allLedger = balances.flatMap((b: any) =>
    (b.ledger || []).map((l: any) => ({
      ...l,
      leaveTypeName: b.leaveTypeName,
    }))
  ).sort((a: any, b: any) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Balances & Ledger"
        description="Inspect your available leave quotas derived directly from the immutable transaction ledger."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {balances.map((b: any) => (
          <StatCard
            key={b.leaveTypeId}
            label={b.leaveTypeName}
            value={`${b.available} days`}
            description={`Annual Allocation: ${b.quota} days (${b.isPaid ? "Paid" : "Unpaid"})`}
            icon={<Coins className="w-5 h-5 text-emerald-500" />}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-primary" />
              Immutable Leave Transaction Ledger
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              PostgreSQL Ledger Source
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Effective Date</th>
                  <th className="py-3 px-4 text-left">Leave Category</th>
                  <th className="py-3 px-4 text-left">Operation</th>
                  <th className="py-3 px-4 text-left">Days</th>
                  <th className="py-3 px-4 text-left">Running Balance</th>
                  <th className="py-3 px-4 text-left">Audit Notes & Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No ledger operations recorded yet. Annual opening balances apply.
                    </td>
                  </tr>
                ) : (
                  allLedger.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {new Date(l.effectiveAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {l.leaveTypeName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            l.entryType === "CREDIT" || l.entryType === "ACCRUAL"
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
                      <td className="py-3 px-4 font-mono font-semibold">
                        {l.entryType === "CREDIT" || l.entryType === "ACCRUAL" ? `+${l.days}` : `-${l.days}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">
                        {l.balance} days
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-sm truncate" title={l.notes}>
                        {l.notes || "System transaction"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
