'use client';

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

type BillingInvoiceRow = {
  id: string;
  invoiceNo: string | null;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
};

function formatINR(val: number) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantBillingPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-billing-invoices"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/billing/invoices");
      return res?.data || res || { invoices: [], subscription: null };
    },
    enabled: isAuthorized,
  });

  const invoices: BillingInvoiceRow[] = Array.isArray(data?.invoices) ? data.invoices : [];
  const subscription = data?.subscription || null;

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant Billing" requiredPermission="workspace.billing.view" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Billing & Invoices"
        description="View your active SaaS subscription plan, renewal schedule, and historical GST/platform invoices."
        actions={
          <Link href="/tenant/subscription">
            <Button size="sm" variant="outline" className="gap-1.5">
              <i className="ph ph-crown" />
              Manage Plan
            </Button>
          </Link>
        }
      />

      {/* Subscription Summary */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {subscription?.planName || "Enterprise Workspace Plan"}
            </CardTitle>
            <CardDescription className="text-xs">
              Billing cycle: {subscription?.billingCycle || "monthly"}
              {subscription?.currentPeriodEnd
                ? ` • Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : ""}
            </CardDescription>
          </div>
          <Badge variant={subscription?.status === "active" ? "success" : "soft"} className="uppercase text-xs">
            {subscription?.status || "Active"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-0">
          <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Monthly Plan Rate</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {formatINR(subscription?.priceMonthly || 0)}
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Total Invoices</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{invoices.length}</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Currency</p>
            <p className="text-lg font-bold text-foreground mt-0.5">INR (₹)</p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <div className="overflow-x-auto border border-border/80 rounded-lg bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/70">
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Invoice No</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Billing Period</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Cycle</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Amount</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <i className="ph ph-spinner-gap animate-spin text-xl text-primary block mx-auto mb-2" />
                  Loading billing invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No billing invoices generated yet for this organization.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground">
                    {inv.invoiceNo || inv.id.slice(0, 10).toUpperCase()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="p-3 capitalize">{inv.billingCycle}</td>
                  <td className="p-3 font-semibold text-foreground">{formatINR(inv.amount)}</td>
                  <td className="p-3">
                    <Badge
                      variant={inv.status === "paid" ? "success" : inv.status === "failed" ? "destructive" : "warning"}
                      className="text-[10px] uppercase"
                    >
                      {inv.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
