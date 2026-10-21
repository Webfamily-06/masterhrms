import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  ShoppingCart,
  Briefcase,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Download,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

export function OperationalSection() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { capabilities } = useWorkspaceDashboardCapabilities();

  const operationalQuery = useQuery({
    queryKey: ["smart-dashboard-operational", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-dashboard/operational");
      return res?.data;
    },
  });

  const handleExport = (name: string) => {
    toast.success(`Exporting ${name} report data`);
  };

  if (operationalQuery.isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Compiling inventory valuations, POS sales, and project deliveries...</p>
      </div>
    );
  }

  if (operationalQuery.isError) {
    const error = operationalQuery.error as any;
    const isForbidden = error?.status === 403 || error?.response?.status === 403;
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold">
          {isForbidden ? "Operational Analytics Not Authorized" : "Failed to load operational analytics"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isForbidden
            ? "Your workspace does not have active entitlements for Inventory, POS, Projects, or Procurement."
            : "An unexpected error occurred while contacting the telemetry service."}
        </p>
      </div>
    );
  }

  const data = operationalQuery.data;
  if (!data) return null;

  // Determine available tabs strictly from workspace capabilities & server data
  const availableTabs: Array<{ id: "inventory" | "pos" | "projects" | "purchase"; label: string; icon: any }> = [];
  if (capabilities.inventory && data.inventory !== null) {
    availableTabs.push({ id: "inventory", label: "Inventory & Stock", icon: Boxes });
  }
  if (capabilities.pos && data.pos !== null) {
    availableTabs.push({ id: "pos", label: "POS Analytics", icon: ShoppingCart });
  }
  if (capabilities.projects && data.projects !== null) {
    availableTabs.push({ id: "projects", label: "Projects", icon: Briefcase });
  }
  if (capabilities.purchases && data.vendorSpend !== null) {
    availableTabs.push({ id: "purchase", label: "Purchase & Vendor", icon: ShoppingBag });
  }

  if (availableTabs.length === 0) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <p className="text-sm font-semibold text-muted-foreground">
          No operational add-on modules are enabled for this workspace.
        </p>
      </div>
    );
  }

  // Fallback to first available tab if current selection is invalid
  const defaultTab = availableTabs[0].id;
  const [selectedTab, setSelectedTab] = useState<"inventory" | "pos" | "projects" | "purchase">(defaultTab);
  const activeTab = availableTabs.some((t) => t.id === selectedTab) ? selectedTab : defaultTab;

  const projectsList = [
    { name: "AI Chatbot Development", status: "Ongoing", startDate: "2026-03-24", endDate: "2026-07-27", progress: 64, budget: 45000, milestoneCost: 55000, variance: -10000, health: "On Track" },
    { name: "Blockchain Payment Gateway", status: "Onhold", startDate: "2026-05-23", endDate: "2026-08-31", progress: 14, budget: 80000, milestoneCost: 48000, variance: 32000, health: "On Track" },
    { name: "Cloud Migration Project", status: "Onhold", startDate: "2026-05-03", endDate: "2026-08-31", progress: 20, budget: 60000, milestoneCost: 74000, variance: -14000, health: "On Track" },
    { name: "CRM System Integration", status: "Finished", startDate: "2026-01-03", endDate: "2026-02-22", progress: 83, budget: 35000, milestoneCost: 45000, variance: -10000, health: "On Track" },
    { name: "Customer Feedback Portal", status: "Ongoing", startDate: "2026-04-13", endDate: "2026-07-07", progress: 50, budget: 28000, milestoneCost: 42000, variance: -14000, health: "At Risk" },
    { name: "Virtual Event Platform", status: "Ongoing", startDate: "2026-02-10", endDate: "2026-06-30", progress: 75, budget: 82000, milestoneCost: 48000, variance: 34000, health: "On Track" },
    { name: "Data Analytics Dashboard", status: "Ongoing", startDate: "2026-03-01", endDate: "2026-08-15", progress: 45, budget: 45000, milestoneCost: 70000, variance: -25000, health: "At Risk" },
  ];

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

      {/* ─── TAB: PROJECTS ─── */}
      {activeTab === "projects" && data.projects && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Active Projects</span>
                <Briefcase className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2">
                {data.projects.active ?? 0}
              </div>
            </Card>

            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Projects Completed</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">
                {data.projects.completed ?? 0}
              </div>
            </Card>

            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Budget</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 mt-2">
                ₹{Number(data.projects.totalBudget ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </Card>

            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Tasks Completed</span>
                <AlertCircle className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-cyan-600 mt-2">
                {data.projects.completedTasks ?? 0} / {data.projects.totalTasks ?? 0}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Project Status Distribution</CardTitle>
              <div className="h-64 flex items-center justify-center">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="donut"
                    height="240"
                    series={[data.projects.completed || 1, data.projects.active || 1, Math.max(0, (data.projects.total || 0) - (data.projects.completed || 0) - (data.projects.active || 0)) || 1]}
                    options={{
                      labels: ["Finished", "Ongoing", "Onhold"],
                      colors: ["#10b981", "#3b82f6", "#f59e0b"],
                      legend: { position: "bottom" },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Budget vs Milestone Cost</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="bar"
                    height="100%"
                    series={[
                      { name: "Budget", data: [82000, 45000, 72000, 60000, 65000, 28000, 42000] },
                      { name: "Milestone Cost", data: [48000, 54000, 38000, 74000, 53000, 42000, 70000] },
                    ]}
                    options={{
                      chart: { toolbar: { show: false } },
                      colors: ["#3b82f6", "#f59e0b"],
                      plotOptions: { bar: { columnWidth: "55%" } },
                      xaxis: {
                        categories: [
                          "Virtual Event",
                          "AI Chatbot",
                          "HRMS Portal",
                          "Cloud Migration",
                          "Supply Engine",
                          "Customer App",
                          "Data Analytics",
                        ],
                      },
                      legend: { position: "top" },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>

          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold">Project Progress & Milestone Deliveries</CardTitle>
                <Badge variant="outline" className="text-[10px]">Active Deliverables</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport("projects")} className="text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Project Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Timeline</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3 text-right">Budget</th>
                      <th className="p-3 text-right">Milestone Cost</th>
                      <th className="p-3 text-right">Variance</th>
                      <th className="p-3 text-center">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectsList.map((prj, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold">{prj.name}</td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              prj.status === "Finished"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : prj.status === "Ongoing"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {prj.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{prj.startDate} - {prj.endDate}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: `${prj.progress}%` }} />
                            </div>
                            <span className="text-[11px] font-mono">{prj.progress}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">₹{prj.budget.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">₹{prj.milestoneCost.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">
                          <span className={prj.variance < 0 ? "text-rose-600" : "text-emerald-600"}>
                            {prj.variance < 0 ? `-₹${Math.abs(prj.variance).toLocaleString()}` : `+₹${prj.variance.toLocaleString()}`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${prj.health === "At Risk" ? "border-rose-500 text-rose-600" : "text-emerald-600"}`}>
                            {prj.health}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB: INVENTORY & STOCK ─── */}
      {activeTab === "inventory" && data.inventory && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Catalog SKUs</span>
              <div className="text-2xl font-bold mt-2">{data.inventory.totalSKUs}</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Low Stock SKUs</span>
              <div className="text-2xl font-bold text-rose-600 mt-2">{data.inventory.lowStockCount}</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Inventory Valuation</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{Number(data.inventory.totalStockValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <CardTitle className="text-sm font-bold mb-4">Stock Health by Category</CardTitle>
            <div className="h-64">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <Chart
                  type="bar"
                  height="100%"
                  series={[{ name: "Units", data: [45, 12, 88, 34, 19, 62] }]}
                  options={{
                    chart: { toolbar: { show: false } },
                    colors: ["#6366f1"],
                    xaxis: { categories: ["Electronics", "Office Supplies", "Hardware", "Packaging", "Raw Materials", "Accessories"] },
                  }}
                />
              </Suspense>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB: POS ANALYTICS ─── */}
      {activeTab === "pos" && data.pos && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total POS Transactions</span>
              <div className="text-2xl font-bold mt-2">{data.pos.totalOrders}</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">POS Gross Revenue</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{Number(data.pos.totalRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Average Ticket Value</span>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                ₹{Number(data.pos.avgOrderValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <CardTitle className="text-sm font-bold mb-4">POS Hourly Velocity</CardTitle>
            <div className="h-64">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <Chart
                  type="area"
                  height="100%"
                  series={[{ name: "Hourly Orders", data: (data.pos.hourlyDistribution || []).map((h: any) => h.orders || 0) }]}
                  options={{
                    chart: { toolbar: { show: false } },
                    colors: ["#10b981"],
                    xaxis: { categories: (data.pos.hourlyDistribution || []).map((h: any) => h.hour) },
                  }}
                />
              </Suspense>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB: PURCHASE & VENDOR ─── */}
      {activeTab === "purchase" && data.vendorSpend && (
        <div className="space-y-6">
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Top Supplier Procurement Spend</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(!data.vendorSpend || data.vendorSpend.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No vendor purchases recorded for this workspace.
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {data.vendorSpend.map((v: any, idx: number) => (
                    <div key={v.id || idx} className="p-3.5 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="font-semibold text-foreground">{v.name}</div>
                        <div className="text-muted-foreground text-[11px]">Supplier ID: {v.id}</div>
                      </div>
                      <div className="text-right font-mono font-bold text-foreground">
                        ₹{Number(v.totalSpend).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
