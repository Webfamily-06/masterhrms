import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Repeat,
  Download,
  Calendar,
  Users,
  AlertOctagon,
  Briefcase,
  FileSearch,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle2,
  DollarSign,
  PieChart,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/ai-hiring-forecast")({
  component: AiHiringForecastPage,
  head: () => ({ meta: [{ title: "AI Hiring Forecast — Master ERP" }] }),
});

export function AiHiringForecastPage() {
  const qc = useQueryClient();
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedQuarter, setSelectedQuarter] = useState("Q3");
  const [pipelinePeriod, setPipelinePeriod] = useState("monthly");
  const [isUpdating, setIsUpdating] = useState(false);

  // ─── Query ────────────────────────────────────────────────────────────────
  const { data: forecastData, isLoading, refetch } = useQuery({
    queryKey: ["ai-hiring-forecast", selectedYear, selectedQuarter, pipelinePeriod],
    queryFn: async () => {
      const res = await api.get("/ai/hiring-forecast");
      return res?.data || res || {};
    },
  });

  const stats = forecastData?.stats || {
    avgActualHire: 169,
    avgPredictedHire: 215,
    headcountNeed: 23,
    attritionRisk: 7.2,
    openRoles: 18,
    offerAcceptRate: 83,
  };

  const timeline = forecastData?.timeline || [
    { month: "Jan", actual: 12, predicted: 15 },
    { month: "Feb", actual: 18, predicted: 20 },
    { month: "Mar", actual: 14, predicted: 18 },
    { month: "Apr", actual: 22, predicted: 24 },
    { month: "May", actual: 16, predicted: 21 },
    { month: "Jun", actual: 25, predicted: 28 },
    { month: "Jul", actual: 19, predicted: 22 },
    { month: "Aug", actual: 28, predicted: 30 },
    { month: "Sep", actual: 15, predicted: 21 },
    { month: "Oct", actual: 20, predicted: 25 },
    { month: "Nov", actual: 18, predicted: 22 },
    { month: "Dec", actual: 24, predicted: 27 },
  ];

  const pipelineDistribution = forecastData?.pipelineDistribution || {
    applied: 59,
    screening: 21,
    interview: 12,
    accepted: 8,
  };

  const rolePipelines = forecastData?.rolePipelines || [
    { id: "1", role: "Office Management App", department: "Engineering", urgency: "Critical", openings: 2, pipelineFill: 90 },
    { id: "2", role: "Sales Executive", department: "Sales", urgency: "High", openings: 5, pipelineFill: 60 },
    { id: "3", role: "Product Designer", department: "Product", urgency: "Planned", openings: 3, pipelineFill: 78 },
    { id: "4", role: "Data Analyst", department: "Operations", urgency: "High", openings: 6, pipelineFill: 85 },
    { id: "5", role: "HR Business Partner", department: "HR & Admin", urgency: "Low", openings: 3, pipelineFill: 95 },
    { id: "6", role: "Digital Marketing Specialist", department: "Marketing", urgency: "Critical", openings: 2, pipelineFill: 90 },
    { id: "7", role: "Business Analyst", department: "Operations", urgency: "Planned", openings: 5, pipelineFill: 95 },
  ];

  const handleUpdateForecast = async () => {
    setIsUpdating(true);
    toast.info("Recalculating AI forecasting models based on recent applicant velocity...");
    try {
      await refetch();
      setTimeout(() => {
        setIsUpdating(false);
        toast.success("AI hiring forecast updated with latest data models.");
      }, 700);
    } catch {
      setIsUpdating(false);
      toast.error("Failed to recompute forecast");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Role", "Department", "Urgency", "Openings", "Pipeline Fill %"];
    const rows = rolePipelines.map((r: any) => [
      `"${r.role}"`,
      `"${r.department}"`,
      `"${r.urgency}"`,
      r.openings,
      `${r.pipelineFill}%`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ai_hiring_forecast_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Hiring forecast exported successfully");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ─── Top Header & Breadcrumbs ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-muted-foreground">AI Center</span>
            <span>/</span>
            <span className="text-foreground font-medium">AI Hiring Forecast</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <span>AI Hiring Forecast</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Predictive talent analytics, recruitment pipeline projections, and machine-learning staffing forecasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5 h-8"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={handleUpdateForecast}
            disabled={isUpdating}
            className="text-xs gap-1.5 h-8 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white"
          >
            <Repeat className={cn("size-3.5", isUpdating && "animate-spin")} />
            <span>Update Forecast</span>
          </Button>
        </div>
      </div>

      {/* ─── Hiring Timeline Forecast (Big Card) ────────────────────────────── */}
      <Card className="shadow-none border">
        <CardHeader className="p-4 sm:p-5 border-b pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <span>Hiring Timeline Forecast</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparison between actual historical hires vs AI predicted hiring targets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-xs w-28">
                <Calendar className="size-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Top metric highlights */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
              <div className="border rounded-lg p-3 bg-muted/20 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1">Average Actual Hire</p>
                <h3 className="text-xl sm:text-2xl font-bold text-primary">
                  {stats.avgActualHire}
                </h3>
              </div>
              <div className="border rounded-lg p-3 bg-muted/20 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1">Average Predicted Hire</p>
                <h3 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.avgPredictedHire}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="size-3 rounded-full bg-primary" />
                <span>Actual Hires</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="size-3 rounded-md bg-indigo-500" />
                <span>Predicted Hires</span>
              </div>
            </div>
          </div>

          {/* Monthly Comparison Bars / Visual representation */}
          <div className="pt-2">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center">
              {timeline.map((item: any) => {
                const maxVal = 35;
                const actualHeight = Math.round((item.actual / maxVal) * 120);
                const predictedHeight = Math.round((item.predicted / maxVal) * 120);

                return (
                  <div key={item.month} className="flex flex-col items-center">
                    <div className="h-[130px] w-full flex items-end justify-center gap-1 pb-1">
                      {/* Actual bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-primary rounded-t-sm transition-all duration-300 hover:opacity-80"
                        style={{ height: `${actualHeight}px` }}
                        title={`Actual: ${item.actual}`}
                      />
                      {/* Predicted bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-indigo-400/80 rounded-t-sm transition-all duration-300 hover:opacity-80"
                        style={{ height: `${predictedHeight}px` }}
                        title={`Predicted: ${item.predicted}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground mt-1">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Hiring Statistics & Pipeline Overview ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hiring Statistics (4 cards) */}
        <div className="lg:col-span-7">
          <Card className="shadow-none border h-full">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Hiring Statistics</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quarterly recruiting targets and risk assessments.
                </p>
              </div>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="h-8 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stat 1 */}
                <Card className="shadow-none border bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Users className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Q3 Headcount Need</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-bold text-foreground">
                            +{stats.headcountNeed}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            +4 <ArrowUpRight className="size-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stat 2 */}
                <Card className="shadow-none border bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <AlertOctagon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Attrition Risk</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-bold text-foreground">
                            {stats.attritionRisk}%
                          </span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            +1.8% <ArrowUpRight className="size-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stat 3 */}
                <Card className="shadow-none border bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Open Roles</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-bold text-foreground">
                            {stats.openRoles}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                            -16% <ArrowDownRight className="size-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stat 4 */}
                <Card className="shadow-none border bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                        <FileSearch className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Offer Accept Rate</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-bold text-foreground">
                            {stats.offerAcceptRate}%
                          </span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            +8% <ArrowUpRight className="size-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Overview */}
        <div className="lg:col-span-5">
          <Card className="shadow-none border h-full">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Hiring Pipeline Overview</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stage distribution of active applicant pool.
                </p>
              </div>
              <Select value={pipelinePeriod} onValueChange={setPipelinePeriod}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {/* Applied */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-primary" />
                      <span>Applied</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {pipelineDistribution.applied}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pipelineDistribution.applied}%` }}
                    />
                  </div>
                </div>

                {/* Screening */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-indigo-500" />
                      <span>Screening</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {pipelineDistribution.screening}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${pipelineDistribution.screening}%` }}
                    />
                  </div>
                </div>

                {/* Interview */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <span>Interview</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {pipelineDistribution.interview}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${pipelineDistribution.interview}%` }}
                    />
                  </div>
                </div>

                {/* Accepted */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span>Accepted</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {pipelineDistribution.accepted}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pipelineDistribution.accepted}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Open Role Pipeline Table & Budget Allocation ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Open Role Pipeline Table */}
        <div className="lg:col-span-8">
          <Card className="shadow-none border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Open Role Pipeline</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time pipeline fill percentage for high-priority requisitions.
                </p>
              </div>
              <Link to="/hr/recruitment/job-postings">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <span>View All Roles</span>
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead className="w-48">Pipeline Fill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolePipelines.map((role: any) => {
                    let badgeClass =
                      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400";
                    if (role.urgency === "Critical") {
                      badgeClass =
                        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
                    } else if (role.urgency === "High") {
                      badgeClass =
                        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400";
                    } else if (role.urgency === "Low") {
                      badgeClass =
                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
                    }

                    return (
                      <TableRow key={role.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground text-sm">
                          {role.role}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {role.department}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-2 py-0.5 font-medium", badgeClass)}
                          >
                            {role.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {role.openings}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  role.pipelineFill > 80
                                    ? "bg-emerald-500"
                                    : role.pipelineFill > 50
                                    ? "bg-primary"
                                    : "bg-amber-500"
                                )}
                                style={{ width: `${role.pipelineFill}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-muted-foreground min-w-[32px]">
                              {role.pipelineFill}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Budget Allocation by Department */}
        <div className="lg:col-span-4">
          <Card className="shadow-none border h-full">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Budget Allocation</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recruiting expenditure by business unit.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="flex items-center gap-1 text-primary">
                  <span className="size-2 rounded-full bg-primary" /> Used
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted-foreground/40" /> Available
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {[
                { dept: "Engineering", used: 75, budget: "$120,000" },
                { dept: "Sales & Marketing", used: 60, budget: "$85,000" },
                { dept: "Product & Design", used: 80, budget: "$50,000" },
                { dept: "Operations & HR", used: 45, budget: "$35,000" },
              ].map((b) => (
                <div key={b.dept} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{b.dept}</span>
                    <span className="text-muted-foreground font-mono">{b.budget} ({b.used}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${b.used}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Role Demand, AI Predictions & Active Positions ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Role Demand Forecast */}
        <Card className="shadow-none border">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold">Role Demand Forecast</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Projected hiring volume by specialization over the next 180 days.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <span className="font-medium text-foreground">Backend Developer</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                32%
              </Badge>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <span className="font-medium text-foreground">Sales Representative</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                24%
              </Badge>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <span className="font-medium text-foreground">Product Designer</span>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                24%
              </Badge>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-dashed">
              <span className="font-medium text-foreground">Technical Support</span>
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                20%
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium text-foreground">DevOps Engineer</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                10%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* AI Hiring Predictions */}
        <Card className="shadow-none border">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Lightbulb className="size-4 text-amber-500" />
              <span>AI Hiring Recommendations</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated advisory signals synthesized from labor trends.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Card 1 */}
            <div className="p-3.5 rounded-lg bg-gradient-to-br from-indigo-500 to-primary text-white shadow-sm space-y-2">
              <h4 className="text-xs font-bold leading-tight">
                High-Demand Alert: Frontend Engineers
              </h4>
              <p className="text-[11px] text-white/90 leading-relaxed">
                Predicted need for 6 frontend engineers by Q3. Market competition is spiking. Initiating candidate outreach now is advised.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-indigo-700">
                  Manager Action
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/20 text-white">
                  30-day trend
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3.5 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-sm space-y-2">
              <h4 className="text-xs font-bold leading-tight">
                Budget Optimization Available
              </h4>
              <p className="text-[11px] text-white/90 leading-relaxed">
                Development recruitment budget under-utilized by $35K. Recommend accelerating senior roles or offering sign-on incentives.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-purple-700">
                  High Priority
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/20 text-white">
                  Actionable
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Position Cards */}
        <Card className="shadow-none border">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold">Active Positions</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live requisition funnel and candidate counts.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {[
              { title: "Product Manager", applicants: 15, interviews: 3, status: "Active", variant: "emerald" },
              { title: "QA Analyst", applicants: 12, interviews: 2, status: "Active", variant: "emerald" },
              { title: "DevOps Engineer", applicants: 16, interviews: 5, status: "Active", variant: "emerald" },
              { title: "Data Scientist", applicants: 18, interviews: 4, status: "Closed", variant: "rose" },
              { title: "UX Designer", applicants: 22, interviews: 6, status: "Interview", variant: "purple" },
            ].map((pos) => (
              <div
                key={pos.title}
                className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
              >
                <div>
                  <h5 className="font-semibold text-foreground text-xs">{pos.title}</h5>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{pos.applicants} Applicants</span>
                    <span>•</span>
                    <span>{pos.interviews} Interviews</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-2 py-0.5 font-medium",
                    pos.variant === "emerald" &&
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
                    pos.variant === "rose" &&
                      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
                    pos.variant === "purple" &&
                      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400"
                  )}
                >
                  {pos.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
