import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Download,
  Loader2,
  ArrowUpRight,
  UserCheck,
  Building2,
  ShoppingCart,
  Boxes,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

export function OverviewSection() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { capabilities } = useWorkspaceDashboardCapabilities();
  const [activeTab, setActiveTab] = useState<"employees" | "customers" | "transactions">("employees");

  const overviewQuery = useQuery({
    queryKey: ["smart-dashboard-overview", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-dashboard/overview");
      return res?.data;
    },
  });

  const handleExport = (datasetName: string) => {
    toast.success(`Exporting ${datasetName} data as CSV`);
  };

  if (overviewQuery.isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Aggregating live business metrics across all authorized modules...</p>
      </div>
    );
  }

  const data = overviewQuery.data;
  if (!data) return null;

  const { summaryCards, quickInsights, moduleSummaries, topEmployees, topCustomers, recentTransactions } = data;

  const canViewEmployees = true;
  const canViewCustomers = Boolean(capabilities.sales || capabilities.crm);
  const canViewTransactions = Boolean(
    capabilities.financial || capabilities.sales || capabilities.pos || capabilities.purchases
  );

  // Auto-switch to employees tab if activeTab is not authorized
  const currentTab =
    activeTab === "customers" && !canViewCustomers
      ? "employees"
      : activeTab === "transactions" && !canViewTransactions
      ? "employees"
      : activeTab;

  const getModuleIcon = (key: string) => {
    switch (key) {
      case "hrm":
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case "crm":
        return <Target className="h-4 w-4 text-purple-500" />;
      case "account":
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case "pos":
        return <ShoppingCart className="h-4 w-4 text-indigo-500" />;
      case "projects":
        return <Briefcase className="h-4 w-4 text-cyan-500" />;
      case "sales":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "inventory":
        return <Boxes className="h-4 w-4 text-rose-500" />;
      default:
        return <Building2 className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. SUMMARY CARDS (Strictly workspace-aware) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Monthly Revenue (Authorized if financial or sales or pos) */}
        {summaryCards?.monthlyRevenue && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Monthly Revenue</span>
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              ₹{Number(summaryCards.monthlyRevenue.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{summaryCards.monthlyRevenue.changePct || 0}% vs last month</span>
            </div>
          </Card>
        )}

        {/* Card 2: Monthly Revenue & Expense Summary (Authorized if financial) */}
        {summaryCards?.netSummary && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Monthly Revenue & Expense Summary</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              ₹{Number(summaryCards.netSummary.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
              <span>{summaryCards.netSummary.marginPct || 0}% margin</span>
            </div>
          </Card>
        )}

        {/* Card 3: Total Employees (Core HRM - Always Available) */}
        {summaryCards?.totalEmployees && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Employees</span>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              {summaryCards.totalEmployees.count || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
              <span className="text-emerald-600">+{summaryCards.totalEmployees.newHires || 0} new hires</span>
              <span>·</span>
              <span className="text-rose-600">{summaryCards.totalEmployees.attrition || 0}% attrition</span>
            </div>
          </Card>
        )}

        {/* Card 4: Total Projects (Authorized if projects enabled) */}
        {summaryCards?.totalProjects && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Projects</span>
              <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              {summaryCards.totalProjects.count || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
              <span>{summaryCards.totalProjects.completed || 0} completed</span>
              <span>·</span>
              <span>{summaryCards.totalProjects.onHold || 0} on hold</span>
            </div>
          </Card>
        )}

        {/* Card 5: Today Attendance (Core HRM - Always Available) */}
        {summaryCards?.todayAttendance && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Today Attendance</span>
              <div className="p-2 bg-pink-500/10 text-pink-600 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              {summaryCards.todayAttendance.rate || 0}%
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
              <span className="text-emerald-600">Today's {summaryCards.todayAttendance.rate || 0}%</span>
              <span>·</span>
              <span>Monthly avg {summaryCards.todayAttendance.monthlyAvg || 0}%</span>
            </div>
          </Card>
        )}

        {/* Card 6: Sales Pipeline (Authorized if CRM or Sales enabled) */}
        {summaryCards?.salesPipeline && (
          <Card className="p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Sales Pipeline</span>
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-2">
              ₹{Number(summaryCards.salesPipeline.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
              <span className="text-purple-600">{summaryCards.salesPipeline.leadsCount || 0} leads</span>
              <span>·</span>
              <span className="text-emerald-600">{summaryCards.salesPipeline.conversionRate || 0}% conversion</span>
            </div>
          </Card>
        )}
      </div>

      {/* ─── 2. QUICK INSIGHTS (Alert cards, 4 columns across) ─── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-tight text-foreground">Quick Insights</h3>
        {(!quickInsights || quickInsights.length === 0) ? (
          <div className="p-4 rounded-xl border bg-muted/20 text-xs text-muted-foreground">
            All systems normal. No critical alerts or threshold warnings for active workspace modules.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickInsights.map((insight: any, idx: number) => {
              const isPos = insight.type === "positive";
              const isInfo = insight.type === "info";
              const isWarn = insight.type === "warning";
              const isCrit = insight.type === "critical";

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isPos
                      ? "bg-emerald-500/5 border-emerald-500/25"
                      : isInfo
                      ? "bg-blue-500/5 border-blue-500/25"
                      : isWarn
                      ? "bg-amber-500/5 border-amber-500/25"
                      : "bg-rose-500/5 border-rose-500/25"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{insight.title}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 capitalize ${
                          isPos
                            ? "bg-emerald-500/10 text-emerald-600"
                            : isInfo
                            ? "bg-blue-500/10 text-blue-600"
                            : isWarn
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {insight.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.message}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    {isPos && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                    {isInfo && <Info className="h-3 w-3 text-blue-600" />}
                    {isWarn && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    {isCrit && <XCircle className="h-3 w-3 text-rose-600" />}
                    <span>Real-time intelligence</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. MODULE SUMMARIES (Dynamically rendered based on active capabilities) ─── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-tight text-foreground">Module Summaries</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(moduleSummaries || {}).map(([key, mod]: [string, any]) => (
            <Card key={key} className="p-3.5 bg-card border shadow-xs hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">{mod.name}</span>
                <div className="p-1.5 rounded-md bg-muted/50">{getModuleIcon(key)}</div>
              </div>
              <div className="space-y-1">
                {mod.metrics?.map((m: any, mIdx: number) => (
                  <div key={mIdx} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{m.label}</span>
                    <span className="font-semibold text-foreground font-mono">{m.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── 4. PERFORMANCE TABLES WITH CONTROLS (Employees, Customers, Transactions) ─── */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {canViewEmployees && (
              <Button
                variant={currentTab === "employees" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("employees")}
                className="text-xs font-semibold gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                Top Employees
              </Button>
            )}
            {canViewCustomers && (
              <Button
                variant={currentTab === "customers" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("customers")}
                className="text-xs font-semibold gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Top Customers
              </Button>
            )}
            {canViewTransactions && (
              <Button
                variant={currentTab === "transactions" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("transactions")}
                className="text-xs font-semibold gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Transactions
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport(currentTab)}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {currentTab === "employees" && (
            <div className="overflow-x-auto">
              {(!topEmployees || topEmployees.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No active employee records found for this workspace.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Employee ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3 text-center">Tasks</th>
                      <th className="p-3 text-center">Attendance %</th>
                      <th className="p-3 text-right">Productivity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topEmployees.map((emp: any, i: number) => (
                      <tr key={emp.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-mono font-medium">{emp.id}</td>
                        <td className="p-3 font-semibold text-foreground">{emp.name}</td>
                        <td className="p-3 text-muted-foreground">{emp.department}</td>
                        <td className="p-3 text-muted-foreground">{emp.designation}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px]">{emp.tasks}</Badge>
                        </td>
                        <td className="p-3 text-center font-medium">{emp.attendancePct}%</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{emp.productivity}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentTab === "customers" && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(!topCustomers || topCustomers.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs col-span-full">
                  No customer revenue records found for this workspace.
                </div>
              ) : (
                topCustomers.map((cust: any) => (
                  <Card key={cust.rank} className="p-4 bg-card border shadow-xs hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">#{cust.rank}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] uppercase px-1.5 py-0 ${
                          cust.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cust.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm truncate">{cust.name}</h4>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Orders:</span>
                        <span className="font-semibold">{cust.orders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Revenue:</span>
                        <span>₹{cust.grossRevenue.toLocaleString()}</span>
                      </div>
                      {cust.returns > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Returns:</span>
                          <span>-₹{cust.returns.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t">
                        <span>Net Revenue:</span>
                        <span>₹{cust.netRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Paid:</span>
                        <span>₹{cust.totalPaid.toLocaleString()}</span>
                      </div>
                      {cust.outstanding > 0 && (
                        <div className="flex justify-between font-medium text-rose-600">
                          <span>Outstanding:</span>
                          <span>₹{cust.outstanding.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <span>Avg Order:</span>
                        <span>₹{cust.avgOrderValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Last Purchase:</span>
                        <span>{cust.lastPurchase}</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {currentTab === "transactions" && (
            <div className="overflow-x-auto">
              {(!recentTransactions || recentTransactions.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No recent transactions recorded for this workspace.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Module</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{tx.date}</td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              tx.type === "Revenue"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : tx.type === "Expense"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{tx.module}</td>
                        <td className="p-3 text-right font-bold">
                          <span className={tx.amount > 0 ? "text-emerald-600" : "text-rose-600"}>
                            {tx.amount > 0 ? `+₹${tx.amount.toLocaleString()}` : `-₹${Math.abs(tx.amount).toLocaleString()}`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {tx.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
