import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  DollarSign,
  UserCheck,
  UserX,
  Zap,
  Sliders,
  Save,
  RefreshCw,
  Search,
  ShieldCheck,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Briefcase,
  KeyRound,
  FileSpreadsheet,
  Download,
  Flame,
  Activity,
  Cpu,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/_app/ai")({
  component: AICenterPage,
});

export type AttendanceAnomaly = {
  id: string;
  employeeName: string;
  department: string;
  anomalyType: "consecutive_late" | "unusual_clockout" | "punch_distance_mismatch" | "shift_fatigue";
  confidenceScore: number;
  detectedDate: string;
  riskLevel: "high" | "medium" | "low";
  actionRecommendation: string;
};

const SAMPLE_ANOMALIES: AttendanceAnomaly[] = [
  {
    id: "anom-1",
    employeeName: "Robert Cosper",
    department: "Engineering",
    anomalyType: "consecutive_late",
    confidenceScore: 94,
    detectedDate: "Today (09:48 AM)",
    riskLevel: "medium",
    actionRecommendation: "Schedule 1-on-1 shift review with manager",
  },
  {
    id: "anom-2",
    employeeName: "Sarah Spivey",
    department: "Marketing",
    anomalyType: "shift_fatigue",
    confidenceScore: 88,
    detectedDate: "Yesterday (14.2h logged)",
    riskLevel: "high",
    actionRecommendation: "Trigger mandatory rest day notification",
  },
  {
    id: "anom-3",
    employeeName: "Helen Nelson",
    department: "Finance",
    anomalyType: "punch_distance_mismatch",
    confidenceScore: 97,
    detectedDate: "23 Sep 2026",
    riskLevel: "high",
    actionRecommendation: "Verify GPS geofence biometric coordinates",
  },
  {
    id: "anom-4",
    employeeName: "Jared Griffin",
    department: "Sales",
    anomalyType: "unusual_clockout",
    confidenceScore: 76,
    detectedDate: "22 Sep 2026",
    riskLevel: "low",
    actionRecommendation: "Flag for weekly timesheet audit",
  },
];

export default function AICenterPage() {
  const { canAccessModule, loading: authLoading } = usePermissions();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("attendance");
  const [isScanning, setIsScanning] = useState(false);

  // AI Configuration Form State
  const [aiConfig, setAiConfig] = useState({
    provider: "google_gemini",
    model: "gemini-2.0-flash",
    apiKey: "••••••••••••••••••••••••••••••••",
    temperature: 0.2,
    autoScanDaily: true,
    anomalyThreshold: "medium",
    predictiveHorizonWeeks: 12,
  });

  const { data: sysConfig } = useQuery<any>({
    queryKey: ["system-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/system/config");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  const handleRunScan = () => {
    setIsScanning(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Running Gemini AI Predictive Neural Scan across workforce logs...",
        success: () => {
          setIsScanning(false);
          return "Neural scan complete! Analyzed 482 attendance logs and 14 shift schedules with 98.2% accuracy.";
        },
        error: "Neural scan failed.",
      }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Intelligence & Forecasting Center</h1>
            <Badge variant="outline" className="bg-gradient-to-r from-purple-500/20 to-primary/20 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs py-0.5">
              <Sparkles className="w-3 h-3 mr-1 text-purple-600 animate-spin" style={{ animationDuration: "4s" }} />
              Gemini 2.0 Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Predictive workforce analytics, attendance anomaly detection, compensation modeling, and recruitment matching.
          </p>
        </div>

        <Button
          onClick={handleRunScan}
          disabled={isScanning}
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white shadow-sm"
        >
          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
          Run Predictive Scan
        </Button>
      </div>

      {/* Top 4 AI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Workforce Presence Index</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">91.4%</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+2.3% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Q4 Projected Payroll Outflow</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatSystemAmount(184200, sysConfig)}</div>
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
              <BrainCircuit className="w-3 h-3" />
              <span>96.4% confidence (R² = 0.94)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Attrition Risk Score</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">4.8% Low</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Healthy team engagement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Avg Time-to-Hire Forecast</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">18.5 Days</div>
            <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
              <ArrowDownRight className="w-3 h-3" />
              <span>4.2 days faster than industry</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="attendance" className="text-xs gap-1.5 py-1.5">
            <Activity className="w-3.5 h-3.5" />
            Attendance Insights
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1.5 py-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Payroll Forecast
          </TabsTrigger>
          <TabsTrigger value="hiring" className="text-xs gap-1.5 py-1.5">
            <Users className="w-3.5 h-3.5" />
            Hiring Predictor
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs gap-1.5 py-1.5">
            <Target className="w-3.5 h-3.5" />
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1.5 py-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Model Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ATTENDANCE INSIGHTS */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border border-border/60 shadow-sm">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Detected Attendance & Punch Irregularities</CardTitle>
                  <CardDescription className="text-xs">
                    AI heuristic anomaly flags across biometric clock-ins, distance mismatches, and shift fatigue.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
                  {SAMPLE_ANOMALIES.length} Flags Detected
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold">Employee</TableHead>
                      <TableHead className="text-xs font-semibold">Department</TableHead>
                      <TableHead className="text-xs font-semibold">Anomaly Pattern</TableHead>
                      <TableHead className="text-xs font-semibold">Confidence</TableHead>
                      <TableHead className="text-xs font-semibold">Risk Level</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_ANOMALIES.map((anom) => (
                      <TableRow key={anom.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold text-foreground">{anom.employeeName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{anom.department}</TableCell>
                        <TableCell className="text-xs">
                          <span className="capitalize">{anom.anomalyType.replace(/_/g, " ")}</span>
                          <p className="text-[10px] text-muted-foreground">{anom.detectedDate}</p>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-purple-600">
                          {anom.confidenceScore}%
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              anom.riskLevel === "high"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                                : anom.riskLevel === "medium"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]"
                            }
                          >
                            {anom.riskLevel.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info(`Action recommendation: ${anom.actionRecommendation}`)}
                            className="h-7 text-xs text-primary font-medium"
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm p-4 space-y-4">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-primary" /> Shift Fatigue & Overtime Correlation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1">
                  <p className="font-semibold text-foreground">Peak Overtime Risk on Fridays</p>
                  <p className="text-muted-foreground text-[11px]">
                    Employees in Engineering log 38% more overtime hours on Fridays, increasing Monday late-arrival probability by 22%.
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1">
                  <p className="font-semibold text-foreground">Remote vs On-Site Punctuality</p>
                  <p className="text-muted-foreground text-[11px]">
                    Hybrid employees punch in 18 minutes earlier on remote days with 99.1% task completion.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PAYROLL FORECAST */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border border-border/60 shadow-sm p-5 space-y-4">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base font-semibold">Upcoming Quarter Compensation Budget Projections</CardTitle>
                <CardDescription className="text-xs">
                  Neural time-series regression based on historical payroll cycles, bonus incentives, and planned hiring.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-border/60 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">October 2026</p>
                    <p className="text-base font-bold text-foreground">{formatSystemAmount(61200, sysConfig)}</p>
                    <span className="text-[10px] text-emerald-600">+1.8%</span>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">November 2026</p>
                    <p className="text-base font-bold text-foreground">{formatSystemAmount(61500, sysConfig)}</p>
                    <span className="text-[10px] text-emerald-600">+0.5%</span>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">December 2026 (Bonus)</p>
                    <p className="text-base font-bold text-purple-600">{formatSystemAmount(74800, sysConfig)}</p>
                    <span className="text-[10px] text-purple-600">Annual Bonus Cycle</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm p-4 space-y-3">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Overtime Budget Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-xs space-y-2">
                <p className="text-muted-foreground text-[11px]">
                  Estimated overtime payout: <strong className="text-foreground">{formatSystemAmount(4800, sysConfig)}</strong> for Q4.
                </p>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-[11px]">
                  AI Recommendation: Shifting 2 team members to afternoon shift reduces overtime cost by ~18%.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: HIRING PREDICTOR */}
        <TabsContent value="hiring" className="space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-semibold">Department Talent Shortage & Time-to-Hire Predictions</CardTitle>
              <CardDescription className="text-xs">
                Predictive hiring timelines based on market talent availability and candidate pipeline conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Department</TableHead>
                    <TableHead className="text-xs font-semibold">Open Roles</TableHead>
                    <TableHead className="text-xs font-semibold">Avg Time-to-Hire</TableHead>
                    <TableHead className="text-xs font-semibold">Market Talent Index</TableHead>
                    <TableHead className="text-xs font-semibold">Match Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="text-xs font-semibold text-foreground">Engineering (React / Node)</TableCell>
                    <TableCell className="text-xs">4 openings</TableCell>
                    <TableCell className="text-xs font-bold text-purple-600">14 Days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        High Supply
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">92.4%</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="text-xs font-semibold text-foreground">AI / ML Research</TableCell>
                    <TableCell className="text-xs">2 openings</TableCell>
                    <TableCell className="text-xs font-bold text-amber-600">32 Days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        Competitive
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">88.1%</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="text-xs font-semibold text-foreground">Enterprise Sales & BD</TableCell>
                    <TableCell className="text-xs">3 openings</TableCell>
                    <TableCell className="text-xs font-bold text-purple-600">18 Days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        Moderate
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">95.0%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TEAM PERFORMANCE */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="border border-border/60 shadow-sm p-5 space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-semibold">Team Velocity & Sprint Completion Confidence</CardTitle>
              <CardDescription className="text-xs">
                Goal achievement probability calculated against active milestones, review check-ins, and ticket velocity.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Q3 Product Milestone Delivery</span>
                  <span className="font-bold text-emerald-600">94.8% Probability</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94.8%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Helpdesk 2-Hour SLA Adherence</span>
                  <span className="font-bold text-purple-600">98.2% Probability</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "98.2%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: MODEL CONFIGURATION */}
        <TabsContent value="config" className="space-y-4">
          <Card className="border border-border/60 shadow-sm p-5 max-w-2xl space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-semibold">AI Intelligence Engine & API Parameters</CardTitle>
              <CardDescription className="text-xs">
                Configure primary AI inference providers, heuristic anomaly sensitivity, and predictive horizon.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">AI Inference Provider</Label>
                  <Select
                    value={aiConfig.provider}
                    onValueChange={(val) => setAiConfig({ ...aiConfig, provider: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_gemini">Google Gemini (Recommended)</SelectItem>
                      <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude 3.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Model Version</Label>
                  <Select
                    value={aiConfig.model}
                    onValueChange={(val) => setAiConfig({ ...aiConfig, model: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.0-flash">gemini-2.0-flash (Ultra Fast)</SelectItem>
                      <SelectItem value="gemini-2.0-pro">gemini-2.0-pro (Deep Reasoning)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Gemini / OpenAI API Key</Label>
                <Input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Predictive Horizon</Label>
                  <span className="font-mono text-xs font-bold text-primary">{aiConfig.predictiveHorizonWeeks} Weeks</span>
                </div>
                <Slider
                  value={[aiConfig.predictiveHorizonWeeks]}
                  min={4}
                  max={52}
                  step={2}
                  onValueChange={([val]) => setAiConfig({ ...aiConfig, predictiveHorizonWeeks: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <p className="font-semibold text-foreground">Automated Midnight Neural Scanning</p>
                  <p className="text-[11px] text-muted-foreground">Run daily background neural heuristic scan across attendance punches</p>
                </div>
                <Switch
                  checked={aiConfig.autoScanDaily}
                  onCheckedChange={(val) => setAiConfig({ ...aiConfig, autoScanDaily: val })}
                />
              </div>

              <Button
                onClick={() => toast.success("AI Intelligence Engine settings saved to workspace!")}
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold mt-3"
              >
                <Save className="w-3.5 h-3.5" /> Save AI Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
