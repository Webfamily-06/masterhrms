import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  Receipt,
  FileText,
  ShoppingBag,
  Users,
  Scale,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";

const Chart = lazy(() => import("react-apexcharts"));

export function SalesSection() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { capabilities } = useWorkspaceDashboardCapabilities();

  const salesQuery = useQuery({
    queryKey: ["smart-dashboard-sales", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-dashboard/sales");
      return res?.data;
    },
  });

  const handleExport = (name: string) => {
    toast.success(`Exporting ${name} report data`);
  };

  if (salesQuery.isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Fetching CRM deal stages, leads funnel, and customer metrics...</p>
      </div>
    );
  }

  if (salesQuery.isError) {
    const error = salesQuery.error as any;
    const isForbidden = error?.status === 403 || error?.response?.status === 403;
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold">
          {isForbidden ? "Sales & CRM Analytics Not Authorized" : "Failed to load sales analytics"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isForbidden
            ? "Your workspace does not have active entitlements for CRM or Sales modules."
            : "An unexpected error occurred while contacting the telemetry service."}
        </p>
      </div>
    );
  }

  const data = salesQuery.data;
  if (!data) return null;

  type SalesTabId = "crm" | "deals" | "invoices" | "proposals" | "purchases" | "customers" | "comparison";
  const availableTabs: Array<{ id: SalesTabId; label: string; icon: any }> = [];

  if (capabilities.crm && data.crm !== null) {
    availableTabs.push({ id: "crm", label: "CRM & Leads", icon: Target });
  }
  if (capabilities.crm && data.deals !== null) {
    availableTabs.push({ id: "deals", label: "Deals", icon: TrendingUp });
  }
  if (capabilities.sales) {
    availableTabs.push({ id: "invoices", label: "Sales Invoices", icon: Receipt });
  }
  if (capabilities.sales && data.proposals !== null) {
    availableTabs.push({ id: "proposals", label: "Proposals", icon: FileText });
  }
  if (capabilities.purchases) {
    availableTabs.push({ id: "purchases", label: "Purchases", icon: ShoppingBag });
  }
  if ((capabilities.sales || capabilities.crm) && data.customers !== null) {
    availableTabs.push({ id: "customers", label: "Customers", icon: Users });
  }
  if (data.comparison !== null && (capabilities.sales || capabilities.purchases)) {
    availableTabs.push({ id: "comparison", label: "Sales vs Purchase", icon: Scale });
  }

  if (availableTabs.length === 0) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <p className="text-sm font-semibold text-muted-foreground">
          No Sales or CRM modules are active for this workspace.
        </p>
      </div>
    );
  }

  const defaultTab = availableTabs[0].id;
  const [selectedTab, setSelectedTab] = useState<SalesTabId>(defaultTab);
  const activeTab = availableTabs.some((t) => t.id === selectedTab) ? selectedTab : defaultTab;

  return (
    <div className="space-y-6">
      {/* ─── DYNAMIC TABS HEADER (matching available capabilities) ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab(tab.id)}
              className="text-xs font-semibold gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* ─── TAB 1: CRM & LEADS ─── */}
      {activeTab === "crm" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Active Leads</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">20</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Pipeline Value</span>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">₹349,000.00</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Conversion Rate</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">65.00%</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Active Deals</span>
              <div className="text-2xl font-bold tracking-tight text-cyan-600 mt-2">14</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Lead Funnel by Stage</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="bar"
                    height="100%"
                    series={[{ name: "Leads", data: [12, 9, 8, 7, 6, 5, 4, 2, 8] }]}
                    options={{
                      colors: ["#3b82f6"],
                      xaxis: { categories: ["Prospect", "Draft", "In Review", "Sent", "Qualified", "Open", "Revised", "Rejected", "Accepted"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Monthly Lead Volume</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="line"
                    height="100%"
                    series={[
                      { name: "Total Leads", data: [15, 22, 28, 35, 42, 50] },
                      { name: "Converted", data: [8, 14, 18, 24, 30, 36] },
                    ]}
                    options={{
                      colors: ["#3b82f6", "#10b981"],
                      stroke: { curve: "smooth", width: 2.5 },
                      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>

          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Leads by Source</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport("leads")} className="text-xs gap-1">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b font-semibold">
                  <tr>
                    <th className="p-3">Source Channel</th>
                    <th className="p-3 text-center">Total Leads</th>
                    <th className="p-3 text-center">Converted</th>
                    <th className="p-3 text-right">Conversion Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/30"><td className="p-3 font-medium">Partner Referral</td><td className="p-3 text-center">14</td><td className="p-3 text-center">11</td><td className="p-3 text-right font-bold text-emerald-600">78.57%</td></tr>
                  <tr className="hover:bg-muted/30"><td className="p-3 font-medium">Google Ads Campaign</td><td className="p-3 text-center">25</td><td className="p-3 text-center">16</td><td className="p-3 text-right font-bold text-emerald-600">64.00%</td></tr>
                  <tr className="hover:bg-muted/30"><td className="p-3 font-medium">LinkedIn Outreach</td><td className="p-3 text-center">18</td><td className="p-3 text-center">10</td><td className="p-3 text-right font-bold text-emerald-600">55.56%</td></tr>
                  <tr className="hover:bg-muted/30"><td className="p-3 font-medium">Website Contact Form</td><td className="p-3 text-center">32</td><td className="p-3 text-center">18</td><td className="p-3 text-right font-bold text-emerald-600">56.25%</td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: DEALS ─── */}
      {activeTab === "deals" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Active Deals</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">70</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Pipeline Value</span>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">₹4,972,000.00</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Win Rate</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">30.00%</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Avg Deal Size</span>
              <div className="text-2xl font-bold tracking-tight text-cyan-600 mt-2">₹71,028.57</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Deals by Stage</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="bar"
                    height="100%"
                    series={[{ name: "Deals", data: [10, 12, 14, 8, 9, 7, 5, 5] }]}
                    options={{
                      colors: ["#8b5cf6"],
                      xaxis: { categories: ["Initial Contact", "Needs Assessment", "Solution Fit", "Qualification", "Proposal", "Handoff", "Decision", "Close"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Deals by Pipeline</CardTitle>
              <div className="h-64 flex items-center justify-center">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="donut"
                    height="240"
                    series={[10, 10, 10, 10, 10, 10, 10]}
                    options={{
                      labels: ["Inbound Leads", "Enterprise", "Renewal", "Partnerships", "Lead Qual", "Marketing", "Sales"],
                      legend: { position: "bottom" },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SALES INVOICES ─── */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Revenue</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">₹277,429.40</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Outstanding Amount</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">₹199,495.80</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Overdue Invoice</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">7</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Proposal Conversion Rate</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">68.5%</div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PROPOSALS ─── */}
      {activeTab === "proposals" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Sent</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">24</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Accepted Proposal</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">16</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Converted to Invoice</span>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">12</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Win Rate</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">66.67%</div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 5: PURCHASES ─── */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Purchases</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">₹164,500.00</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Outstanding Payables</span>
              <div className="text-2xl font-bold tracking-tight text-amber-600 mt-2">₹82,250.00</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Overdue Payables</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">₹27,000.00</div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 6: CUSTOMERS ─── */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Customers</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">48</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">New This Month</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">6</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Avg CLV</span>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">₹84,200.00</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">At Risk Customers</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">3</div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 7: SALES VS PURCHASE ─── */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Gross Profit</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">₹112,929.40</div>
              <div className="text-xs text-muted-foreground mt-1">Revenue surplus</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Gross Margin %</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">40.71%</div>
              <div className="text-xs text-muted-foreground mt-1">Healthy margin</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Revenue-to-Cost Ratio</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">1.69x</div>
              <div className="text-xs text-muted-foreground mt-1">Revenue per cost unit</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Net Returns Impact %</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">1.45%</div>
              <div className="text-xs text-muted-foreground mt-1">Low exposure</div>
            </Card>
          </div>

          <Card className="p-5 shadow-xs">
            <CardTitle className="text-sm font-bold mb-4">Monthly Sales vs Purchase Comparison</CardTitle>
            <div className="h-64">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <Chart
                  type="bar"
                  height="100%"
                  series={[
                    { name: "Sales Revenue", data: [120000, 150000, 277429] },
                    { name: "Purchase Cost", data: [70000, 95000, 164500] },
                    { name: "Gross Profit", data: [50000, 55000, 112929] },
                  ]}
                  options={{
                    colors: ["#3b82f6", "#ef4444", "#10b981"],
                    plotOptions: { bar: { columnWidth: "55%" } },
                    xaxis: { categories: ["April", "May", "June"] },
                  }}
                />
              </Suspense>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
