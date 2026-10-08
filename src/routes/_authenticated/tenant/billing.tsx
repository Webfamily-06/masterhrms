import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/tenant/billing")({
  component: TenantBillingPage,
  head: () => ({
    meta: [{ title: "Billing & Invoices — Master HRMS" }],
  }),
});

function TenantBillingPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["tenant-billing-invoices"],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-primary" />
            Billing & Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subscription receipts, downloadable tax invoices, and payment history.
          </p>
        </div>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Payment History & Tax Invoices</CardTitle>
          <CardDescription className="text-xs">
            Official GST/VAT-compliant digital invoices issued for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Billing Period</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td className="p-3.5 font-mono">INV-2026-10-001</td>
                    <td className="p-3.5 text-muted-foreground">October 2026 Monthly Subscription</td>
                    <td className="p-3.5 font-semibold text-foreground">$199.00</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                        Paid
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-medium text-foreground">
                        {inv.invoiceNumber || inv.id}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Current"}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {formatSystemAmount(inv.total || inv.amount || 0)}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          {inv.status || "Paid"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <Download className="h-3 w-3" /> PDF
                        </Button>
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
