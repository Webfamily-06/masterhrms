import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download, ExternalLink, CheckCircle2, Loader2, Calendar, FileText } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/tenant/billing")({
  component: TenantBillingPage,
  head: () => ({
    meta: [{ title: "Billing & Invoices — Master HRMS" }],
  }),
});

function formatItemName(inv: any): string {
  if (inv.planId?.startsWith("addon_")) {
    const slug = inv.planId.replace("addon_", "").replace(/-/g, " ");
    return `Add-on: ${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
  }
  if (inv.invoiceNo?.startsWith("ADDON-INV")) {
    return `Add-on: Modular Extension`;
  }
  if (inv.planId) {
    return `Subscription: ${inv.planId.replace(/-/g, " ")}`;
  }
  return inv.itemName || "Workspace Subscription";
}

function handleDownloadPdf(invoiceId: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const baseUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
  window.open(`${baseUrl}/api/billing/invoices/${invoiceId}/download?token=${token || ""}`, "_blank");
}

function TenantBillingPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["tenant-billing-invoices"],
    queryFn: async () => {
      try {
        const res = await api.get("/billing/invoices");
        const list = Array.isArray(res) ? res : res?.items || [];
        return list;
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Billing & Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subscription receipts, add-on purchase invoices, downloadable tax receipts, and payment history.
          </p>
        </div>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="size-4 text-emerald-500" />
            Payment History & Tax Invoices
          </CardTitle>
          <CardDescription className="text-xs">
            Official GST/VAT-compliant digital invoices issued for your workspace subscriptions and modular add-ons.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Item Description</th>
                  <th className="p-3.5">Billing Period</th>
                  <th className="p-3.5">Expiry / Renewal Date</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <FileText className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => {
                    const isPaid = inv.status === "paid";
                    const isAddon = inv.invoiceNo?.startsWith("ADDON-INV") || inv.planId?.startsWith("addon_");

                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                          {inv.invoiceNo || inv.invoiceNumber || inv.id}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {isAddon ? (
                              <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold">
                                Add-on
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                Plan
                              </Badge>
                            )}
                            <span className="capitalize">{formatItemName(inv)}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                          {inv.periodStart && inv.periodEnd
                            ? `${new Date(inv.periodStart).toLocaleDateString()} - ${new Date(inv.periodEnd).toLocaleDateString()}`
                            : inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString()
                            : "Standard"}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {inv.periodEnd ? (
                            <Badge variant="outline" className="font-mono text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold gap-1">
                              <Calendar className="size-3" />
                              {new Date(inv.periodEnd).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-foreground whitespace-nowrap">
                          {Number(inv.amount) === 0 ? "Free" : formatSystemAmount(Number(inv.amount || 0))}
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap capitalize">
                          {inv.paymentMethod || "Online Gateway"}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold"
                            }
                          >
                            {inv.status ? inv.status.toUpperCase() : "PAID"}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPdf(inv.id)}
                            className="h-7 text-xs gap-1 hover:text-primary hover:bg-primary/10"
                            title="Download official tax invoice PDF"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TenantBillingPage;
