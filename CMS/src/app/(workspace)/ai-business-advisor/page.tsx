'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Settings,
  Check,
  X,
  Filter,
} from "lucide-react";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { toast } from "sonner";
import {  Link  } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));



export default function AiBusinessAdvisorPage() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { hasEntitlement, isLoading: isNavLoading } = useNavigationResolver();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Filter toolbar states matching image1.png
  const [alertModule, setAlertModule] = useState<string>("all");
  const [alertShowAll, setAlertShowAll] = useState<boolean>(false);

  const [insightModule, setInsightModule] = useState<string>("all");
  const [insightShowAll, setInsightShowAll] = useState<boolean>(false);

  const [recModule, setRecModule] = useState<string>("all");
  const [recShowAll, setRecShowAll] = useState<boolean>(false);

  const isEntitled = hasEntitlement("ai-business-advisor");

  // Query Dashboard Analysis
  const advisorQuery = useQuery({
    queryKey: ["ai-business-advisor-dashboard", tenantId, selectedDate],
    queryFn: async () => {
      const res = await api.get(`/ai-business-advisor/dashboard?date=${selectedDate}`);
      return res?.data;
    },
    enabled: isEntitled,
  });

  // Mutation: Generate Now
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/ai-business-advisor/generate", { force: true, date: selectedDate });
      return res?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-business-advisor-dashboard", tenantId] });
      toast.success("AI Business Analysis freshly computed and persisted.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate AI analysis");
    },
  });

  // Mutation: Dismiss Insight
  const dismissInsightMutation = useMutation({
    mutationFn: async (insightId: string) => {
      return await api.post(`/ai-business-advisor/insights/${insightId}/dismiss`, { date: selectedDate });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-business-advisor-dashboard", tenantId] });
      toast.info("Insight dismissed.");
    },
  });

  // Mutation: Recommendation Status
  const updateRecMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "completed" | "dismissed" }) => {
      return await api.post(`/ai-business-advisor/recommendations/${id}/status`, { status, date: selectedDate });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ai-business-advisor-dashboard", tenantId] });
      toast.success(vars.status === "completed" ? "Recommendation marked as done!" : "Recommendation dismissed.");
    },
  });

  // Mutation: Resolve Alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await api.post(`/ai-business-advisor/alerts/${alertId}/resolve`, { date: selectedDate });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-business-advisor-dashboard", tenantId] });
      toast.success("Alert marked as resolved.");
    },
  });

  if (!isNavLoading && !isEntitled) {
    return (
      <AddonNotInstalled
        addonName="AI Business Advisor"
        addonSlug="ai-business-advisor"
        category="AI"
        description="Autonomous executive business advisor evaluating daily cross-module health scores, predictive alerts, and actionable recommendations."
      />
    );
  }

  const analysis = advisorQuery.data;

  // Filtered lists
  const alertsList = (analysis?.alerts || []).filter((a: any) => {
    if (!alertShowAll && a.resolved) return false;
    if (alertModule !== "all" && a.category && a.category.toLowerCase() !== alertModule.toLowerCase()) return false;
    return true;
  });

  const insightsList = (analysis?.insights || []).filter((i: any) => {
    if (!insightShowAll && i.dismissed) return false;
    if (insightModule !== "all" && i.category && i.category.toLowerCase() !== insightModule.toLowerCase()) return false;
    return true;
  });

  const recsList = (analysis?.recommendations || []).filter((r: any) => {
    if (!recShowAll && r.status !== "pending") return false;
    if (recModule !== "all" && r.category && r.category.toLowerCase() !== recModule.toLowerCase()) return false;
    return true;
  });

  const overallScoreNum = Number(analysis?.scores?.overall ?? 38.0);
  const formattedScore = overallScoreNum.toFixed(2);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-3xl font-bold tracking-tight">AI Business Advisor</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
              <Sparkles className="h-3 w-3 mr-1" />
              Autonomous Copilot
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily 06:00 health analysis, strategic recommendations, and threat alerts based on live company data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-card border px-3 py-1.5 rounded-lg shadow-xs text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="shadow-xs"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Now
          </Button>
        </div>
      </div>

      {/* Setup Required Banner */}
      {analysis?.setupRequired && (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Local Telemetry Active</div>
                <div className="text-xs opacity-90 mt-0.5">
                  AI Business Advisor is evaluating local company telemetry. Connect your LLM API provider in Settings for autonomous generative narratives.
                </div>
              </div>
            </div>
            <Link to="/ai-configuration">
              <Button size="sm" variant="outline" className="text-xs whitespace-nowrap bg-background">
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Configure AI Provider
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {advisorQuery.isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Synthesizing cross-module telemetry and evaluating company health score...</p>
        </div>
      ) : analysis ? (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              TOP ROW: HEALTH SCORE GAUGE + CATEGORY BREAKDOWN + 7-DAY TREND (image1.png)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1: Overall Health Score (Radial Gauge) */}
            <Card className="lg:col-span-3 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overall Health Score
                  </span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs font-semibold ${
                      analysis.trend === "improving"
                        ? "text-emerald-600 border-emerald-500/30"
                        : analysis.trend === "declining"
                        ? "text-rose-600 border-rose-500/30"
                        : "text-blue-600 border-blue-500/30"
                    }`}
                  >
                    {analysis.trend === "improving" ? (
                      <TrendingUp className="h-3.5 w-3.5 mr-1 inline" />
                    ) : analysis.trend === "declining" ? (
                      <TrendingDown className="h-3.5 w-3.5 mr-1 inline" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 mr-1 inline" />
                    )}
                    {analysis.trend}
                  </Badge>
                </div>

                {/* Circular Gauge Display */}
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative size-36 rounded-full border-8 border-primary/20 flex flex-col items-center justify-center bg-muted/20">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">
                      {formattedScore}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">/ 100</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="mt-4 text-xs font-medium px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20"
                  >
                    Attention Required
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground text-center">
                Last calculated for {analysis.date}
              </div>
            </Card>

            {/* Card 2: Category Breakdown (2 Columns of 5 Pillars matching image1.png) */}
            <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category Breakdown
                  </span>
                  <span className="text-xs text-muted-foreground">5 Core Pillars</span>
                </div>

                {/* 2 Columns: Financial, Sales, Operations on Left; Team, Projects on Right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 text-xs">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between font-medium">
                        <span>Financial (30%)</span>
                        <span className="font-semibold text-emerald-600">{analysis.scores.financial}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${analysis.scores.financial}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium">
                        <span>Sales (25%)</span>
                        <span className="font-semibold text-blue-600">{analysis.scores.sales}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${analysis.scores.sales}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium">
                        <span>Operations (10%)</span>
                        <span className="font-semibold text-indigo-600">{analysis.scores.operations}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${analysis.scores.operations}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between font-medium">
                        <span>Team (20%)</span>
                        <span className="font-semibold text-purple-600">{analysis.scores.team}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${analysis.scores.team}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium">
                        <span>Projects (15%)</span>
                        <span className="font-semibold text-amber-600">{analysis.scores.projects}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all"
                          style={{ width: `${analysis.scores.projects}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Weighted Aggregation Formula</span>
                <span className="font-mono">Composite Index</span>
              </div>
            </Card>

            {/* Card 3: 7-day Trend (Line / Area Chart) */}
            <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    7-day Trend
                  </span>
                  <span className="text-xs text-muted-foreground">Oct 07 — Oct 13</span>
                </div>

                <div className="h-56 mt-2">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                    <Chart
                      type="area"
                      height="100%"
                      series={[
                        {
                          name: "Health Score",
                          data: analysis.scoreHistory7Days?.map((h: any) => h.score) || [],
                        },
                      ]}
                      options={{
                        chart: { toolbar: { show: false } },
                        colors: ["#3b82f6"],
                        dataLabels: { enabled: false },
                        stroke: { curve: "smooth", width: 2.5 },
                        markers: { size: 3.5, strokeWidth: 1.5 },
                        xaxis: {
                          categories: analysis.scoreHistory7Days?.map((h: any) => h.date?.slice(5)) || [],
                          labels: { style: { fontSize: "10px" } },
                        },
                        yaxis: { min: 20, max: 100, labels: { style: { fontSize: "10px" } } },
                        grid: { borderColor: "#f1f5f9" },
                        fill: {
                          type: "gradient",
                          gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
                        },
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              BOTTOM ROW: 3 COLUMNS (Alerts, Insights, Recommendations)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── COLUMN 1: ALERTS ─── */}
            <Card className="flex flex-col">
              <CardHeader className="p-4 pb-3 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <CardTitle className="text-base font-bold">Alerts</CardTitle>
                    <Badge variant="secondary" className="text-xs ml-1 font-semibold">
                      {alertsList.length}
                    </Badge>
                  </div>
                </div>

                {/* Filter Toolbar: All Modules Dropdown + Show All Checkbox */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <select
                    value={alertModule}
                    onChange={(e) => setAlertModule(e.target.value)}
                    className="h-7 px-2 rounded border bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Modules</option>
                    <option value="financial">Financial</option>
                    <option value="sales">Sales</option>
                    <option value="team">Team</option>
                    <option value="operations">Operations</option>
                  </select>

                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-[11px]">
                    <input
                      type="checkbox"
                      checked={alertShowAll}
                      onChange={(e) => setAlertShowAll(e.target.checked)}
                      className="rounded size-3.5"
                    />
                    <span>Show all</span>
                  </label>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 space-y-3">
                {alertsList.length > 0 ? (
                  alertsList.map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-2.5 transition-all ${
                        alert.severity === "critical"
                          ? "border-l-4 border-l-rose-500 bg-card"
                          : alert.severity === "warning"
                          ? "border-l-4 border-l-amber-500 bg-card"
                          : "border-l-4 border-l-blue-500 bg-card"
                      } ${alert.resolved ? "opacity-50 bg-muted/20" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          {alert.category || "General"}
                        </Badge>
                        <Badge
                          variant={alert.severity === "critical" ? "destructive" : "secondary"}
                          className="text-[10px] uppercase"
                        >
                          {alert.severity}
                        </Badge>
                      </div>

                      <div className="font-semibold text-foreground text-sm">{alert.title}</div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{alert.description}</p>

                      <div className="pt-2 flex items-center justify-between border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                        {alert.resolved ? (
                          <span className="text-emerald-600 font-medium text-[11px] flex items-center">
                            <Check className="size-3 mr-1" /> Read
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2.5 font-medium hover:bg-primary hover:text-primary-foreground"
                            onClick={() => resolveAlertMutation.mutate(alert.id)}
                            disabled={resolveAlertMutation.isPending}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No active threat alerts for this filter.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── COLUMN 2: INSIGHTS ─── */}
            <Card className="flex flex-col">
              <CardHeader className="p-4 pb-3 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-base font-bold">Insights</CardTitle>
                    <Badge variant="secondary" className="text-xs ml-1 font-semibold">
                      {insightsList.length}
                    </Badge>
                  </div>
                </div>

                {/* Filter Toolbar: All Modules Dropdown + Show All Checkbox */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <select
                    value={insightModule}
                    onChange={(e) => setInsightModule(e.target.value)}
                    className="h-7 px-2 rounded border bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Modules</option>
                    <option value="financial">Financial</option>
                    <option value="sales">Sales</option>
                    <option value="team">Team</option>
                    <option value="projects">Projects</option>
                  </select>

                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-[11px]">
                    <input
                      type="checkbox"
                      checked={insightShowAll}
                      onChange={(e) => setInsightShowAll(e.target.checked)}
                      className="rounded size-3.5"
                    />
                    <span>Show all</span>
                  </label>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 space-y-3">
                {insightsList.length > 0 ? (
                  insightsList.map((insight: any) => (
                    <div
                      key={insight.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-2.5 bg-card relative ${
                        insight.dismissed ? "opacity-50 bg-muted/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          {insight.category}
                        </Badge>
                        {!insight.dismissed && (
                          <button
                            onClick={() => dismissInsightMutation.mutate(insight.id)}
                            disabled={dismissInsightMutation.isPending}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                            title="Dismiss insight"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="font-semibold text-foreground text-sm">{insight.title}</div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{insight.description}</p>

                      <div className="pt-2 flex items-center justify-between border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>Impact: <strong className="capitalize text-foreground font-medium">{insight.impact}</strong></span>
                        <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No insights generated for this filter.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── COLUMN 3: RECOMMENDATIONS ─── */}
            <Card className="flex flex-col">
              <CardHeader className="p-4 pb-3 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-base font-bold">Recommendations</CardTitle>
                    <Badge variant="secondary" className="text-xs ml-1 font-semibold">
                      {recsList.length}
                    </Badge>
                  </div>
                </div>

                {/* Filter Toolbar: All Modules Dropdown + Show All Checkbox */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <select
                    value={recModule}
                    onChange={(e) => setRecModule(e.target.value)}
                    className="h-7 px-2 rounded border bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Modules</option>
                    <option value="financial">Financial</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                  </select>

                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-[11px]">
                    <input
                      type="checkbox"
                      checked={recShowAll}
                      onChange={(e) => setRecShowAll(e.target.checked)}
                      className="rounded size-3.5"
                    />
                    <span>Show all</span>
                  </label>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 space-y-3">
                {recsList.length > 0 ? (
                  recsList.map((rec: any) => (
                    <div
                      key={rec.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-2.5 bg-card ${
                        rec.status !== "pending" ? "opacity-50 bg-muted/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            rec.priority === "high"
                              ? "text-rose-600 border-rose-500/30"
                              : "text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground">
                          {rec.category}
                        </Badge>
                      </div>

                      <div className="font-semibold text-foreground text-sm">{rec.title}</div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{rec.description}</p>

                      <div className="pt-2 flex items-center justify-between border-t border-border/40">
                        {rec.status === "completed" ? (
                          <span className="text-emerald-600 font-medium text-[11px] flex items-center">
                            <Check className="size-3 mr-1" /> Done
                          </span>
                        ) : rec.status === "dismissed" ? (
                          <span className="text-muted-foreground text-[11px]">Dismissed</span>
                        ) : (
                          <div className="flex items-center gap-2 ml-auto">
                            <Button
                              size="sm"
                              className="h-6 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                              onClick={() => updateRecMutation.mutate({ id: rec.id, status: "completed" })}
                              disabled={updateRecMutation.isPending}
                            >
                              Done
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground font-medium"
                              onClick={() => updateRecMutation.mutate({ id: rec.id, status: "dismissed" })}
                              disabled={updateRecMutation.isPending}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No recommendations pending for this filter.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
