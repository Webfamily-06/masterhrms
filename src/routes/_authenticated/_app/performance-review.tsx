import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAddon } from "@/hooks/use-addon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Printer,
  ChevronRight,
  ArrowLeft,
  Star,
  Award,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Briefcase,
  User,
  Sparkles,
  FileCheck,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/performance-review")({
  validateSearch: z.object({
    id: z.string().optional(),
  }),
  component: PerformanceReviewPage,
  head: () => ({
    meta: [{ title: "Performance Review Scorecard — Master HRMS" }],
  }),
});

const KRA_ITEMS = [
  { id: 1, kra: "Client Satisfaction & Delivery", kpi: "Customer Experience", weight: 15, expected: "Advanced" },
  { id: 2, kra: "Go-to-Market & Campaign Growth", kpi: "Marketing", weight: 10, expected: "Intermediate" },
  { id: 3, kra: "Project Leadership & Resource Planning", kpi: "Management", weight: 15, expected: "Advanced" },
  { id: 4, kra: "Standard Operating Compliance", kpi: "Administration", weight: 10, expected: "Intermediate" },
  { id: 5, kra: "Stakeholder Demonstrations", kpi: "Presentation Skills", weight: 15, expected: "Advanced" },
  { id: 6, kra: "Code / Output Excellence", kpi: "Quality of Work", weight: 20, expected: "Expert" },
  { id: 7, kra: "Sprint Velocity & Throughput", kpi: "Efficiency", weight: 15, expected: "Advanced" },
];

const ATTRIBUTE_ITEMS = [
  { id: 1, attr: "Ethics & Compliance", kpi: "Integrity", weight: 15, expected: "Expert" },
  { id: 2, attr: "Workplace Conduct & Accountability", kpi: "Professionalism", weight: 15, expected: "Advanced" },
  { id: 3, attr: "Cross-Functional Collaboration", kpi: "Team Work", weight: 15, expected: "Advanced" },
  { id: 4, attr: "Root-Cause Problem Solving", kpi: "Critical Thinking", weight: 15, expected: "Advanced" },
  { id: 5, attr: "Resolution & Mediation", kpi: "Conflict Management", weight: 10, expected: "Intermediate" },
  { id: 6, attr: "Punctuality & Reliability", kpi: "Attendance", weight: 15, expected: "Advanced" },
  { id: 7, attr: "SLA Adherence", kpi: "Ability To Meet Deadline", weight: 15, expected: "Expert" },
];

function levelToScore(level: string): number {
  switch (level?.toLowerCase()) {
    case "expert":
      return 100;
    case "advanced":
      return 85;
    case "intermediate":
      return 70;
    case "beginner":
      return 55;
    default:
      return 75;
  }
}

export function PerformanceReviewPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { isEntitled, isTrial, startTrial, isStartingTrial, subscribe, isSubscribing } =
    useAddon("okr-performance");

  // Query all appraisals for selector
  const { data: appraisalsData } = useQuery({
    queryKey: ["performance-appraisals-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/okr/appraisals");
        return res?.appraisals || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const appraisalsList: any[] = appraisalsData || [];

  // Active appraisal selection
  const [selectedId, setSelectedId] = useState<string>(searchParams.id || "");

  useEffect(() => {
    if (searchParams.id) {
      setSelectedId(searchParams.id);
    } else if (appraisalsList.length > 0 && !selectedId) {
      setSelectedId(appraisalsList[0].id);
    }
  }, [searchParams.id, appraisalsList]);

  // Query Scorecard for selected appraisal
  const { data: scorecardData, isLoading } = useQuery({
    queryKey: ["performance-scorecard", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      try {
        const res = await api.get(`/addons/okr/reviews/${selectedId}/scorecard`);
        return res?.scorecard || null;
      } catch (err: any) {
        return null;
      }
    },
    enabled: isEntitled && !!selectedId,
  });

  const activeScorecard = scorecardData;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  if (!isEntitled) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Review Scorecard</h1>
            <p className="text-sm text-muted-foreground">Standardized Multi-Pillar Employee Evaluation Sheets</p>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <Target className="h-12 w-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-bold">OKR & Performance Add-On Required</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Access official performance scorecards, detailed technical and personal excellence ratings, and printable sign-off sheets.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={() => startTrial()} disabled={isStartingTrial} className="bg-amber-600 hover:bg-amber-700">
                Start 14-Day Free Trial
              </Button>
              <Button variant="outline" onClick={() => subscribe("pro_annual")} disabled={isSubscribing}>
                Subscribe to Module
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate scores
  const ratingScoreNum = activeScorecard ? Number(activeScorecard.ratingScore || 4.0) : 4.0;
  const ratingPercentage = Math.min(100, Math.round((ratingScoreNum / 5.0) * 100));

  let gradeLabel = "Meets Expectations";
  let gradeBadgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (ratingPercentage >= 90) {
    gradeLabel = "Outstanding (Grade A+)";
    gradeBadgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  } else if (ratingPercentage >= 80) {
    gradeLabel = "Exceeds Expectations (Grade A)";
    gradeBadgeClass = "bg-teal-500/10 text-teal-600 border-teal-500/20";
  } else if (ratingPercentage >= 70) {
    gradeLabel = "Meets Expectations (Grade B)";
    gradeBadgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
  } else {
    gradeLabel = "Needs Improvement (Grade C)";
    gradeBadgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-200 print:p-0 print:space-y-4">
      {/* Top Header & Actions (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/okr" className="hover:text-foreground">Performance</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/performance-appraisal" className="hover:text-foreground">Appraisal</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Review Scorecard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Review Scorecard</h1>
          <p className="text-xs text-muted-foreground">
            Official evaluation record, competency scores, and developmental grading sheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {appraisalsList.length > 0 && (
            <Select
              value={selectedId}
              onValueChange={(val) => {
                setSelectedId(val);
                navigate({ to: "/performance-review", search: { id: val } });
              }}
            >
              <SelectTrigger className="w-[240px] h-9 text-xs">
                <SelectValue placeholder="Select Employee Appraisal" />
              </SelectTrigger>
              <SelectContent>
                {appraisalsList.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.employee?.firstName} {app.employee?.lastName} ({app.employee?.position || "Staff"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/performance-appraisal" })} className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Appraisals
          </Button>

          <Button size="sm" onClick={handlePrint} className="gap-2 text-xs bg-primary hover:bg-primary/90">
            <Printer className="h-3.5 w-3.5" />
            Print Scorecard
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-xs text-muted-foreground">
          Loading performance scorecard...
        </Card>
      ) : !activeScorecard ? (
        <Card className="p-12 text-center space-y-3">
          <Award className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-base">No Appraisal Selected</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Please choose an employee appraisal from the dropdown or return to the Appraisals list to select a record.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/performance-appraisal" })}>
            View All Appraisals
          </Button>
        </Card>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {/* Card 1: Employee Basic Information */}
          <Card className="border border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Employee Basic Information</CardTitle>
                  <CardDescription className="text-[11px]">Primary personnel profile and evaluation scope</CardDescription>
                </div>
                <Badge variant="outline" className={gradeBadgeClass}>
                  {gradeLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                <div className="flex items-center gap-3 col-span-1 md:col-span-2">
                  <Avatar className="h-14 w-14 border border-border">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-base bg-primary/10 text-primary font-bold">
                      {activeScorecard.employee.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-base font-bold text-foreground">{activeScorecard.employee.name}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{activeScorecard.employee.position}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        ID: {activeScorecard.employee.employeeNumber}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {activeScorecard.employee.department}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Date of Joining:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(activeScorecard.employee.dateOfJoining).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Appraisal Date:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(activeScorecard.appraisalDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Review Cycle:</span>
                    <span className="font-semibold text-foreground">{activeScorecard.reviewPeriod}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Reporting Officer (RO):</span>
                    <span className="font-semibold text-foreground">{activeScorecard.employee.managerName}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Professional Excellence (KRAs & KPIs) */}
          <Card className="border border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Professional Excellence (Technical Competencies & KRAs)
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Evaluation of role-specific deliverables, technical quality, and throughput
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="w-12 text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Key Result Area (KRA)</TableHead>
                    <TableHead className="text-xs font-semibold">Competency Indicator</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Weightage</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Benchmark</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Achieved Level</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Points Scored</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KRA_ITEMS.map((item, idx) => {
                    const assessed =
                      activeScorecard.competencies.technical[
                        item.kpi.toLowerCase().replace(/[\s-]/g, "") === "presentation"
                          ? "presentationSkills"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "") === "customerexperience"
                          ? "customerExperience"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "") === "qualityofwork"
                          ? "qualityOfWork"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "")
                      ] || "Intermediate";
                    const score = levelToScore(assessed);
                    const weightedPoints = ((score * item.weight) / 100).toFixed(1);

                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-semibold text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{item.kra}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {item.kpi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{item.weight}%</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.expected}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {assessed}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">{weightedPoints}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Card 3: Personal Excellence (Organizational Competencies) */}
          <Card className="border border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Personal Excellence (Organizational Culture & Values)
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Evaluation of teamwork, problem solving, integrity, and behavioral standards
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="w-12 text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Personal Attribute</TableHead>
                    <TableHead className="text-xs font-semibold">Organizational KPI</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Weightage</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Benchmark</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Achieved Level</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Points Scored</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ATTRIBUTE_ITEMS.map((item, idx) => {
                    const assessed =
                      activeScorecard.competencies.organizational[
                        item.kpi.toLowerCase().replace(/[\s-]/g, "") === "teamwork"
                          ? "teamWork"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "") === "criticalthinking"
                          ? "criticalThinking"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "") === "conflictmanagement"
                          ? "conflictManagement"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "") === "abilitytomeetdeadline"
                          ? "abilityToMeetDeadline"
                          : item.kpi.toLowerCase().replace(/[\s-]/g, "")
                      ] || "Intermediate";
                    const score = levelToScore(assessed);
                    const weightedPoints = ((score * item.weight) / 100).toFixed(1);

                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-semibold text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{item.attr}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {item.kpi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{item.weight}%</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.expected}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                            {assessed}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">{weightedPoints}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Card 4: Final Grading & Scoring Summary */}
          <Card className="border border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600" />
                Final Grading & Cumulative Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-2 text-center md:text-left">
                  <span className="text-xs font-semibold text-muted-foreground">Cumulative Rating Score</span>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="text-4xl font-extrabold text-foreground">{ratingScoreNum.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                    <div className="flex gap-0.5 ml-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= Math.round(ratingScoreNum)
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Progress value={ratingPercentage} className="h-2 w-full mt-2" />
                  <p className="text-[11px] text-muted-foreground">{ratingPercentage}% of maximum developmental target</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Performance Classification
                  </span>
                  <div className="text-base font-bold text-foreground">{gradeLabel}</div>
                  <Badge variant="outline" className={`text-xs mt-1 ${gradeBadgeClass}`}>
                    Status: Verified & Signed
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground block">Rating Scale Guidance:</span>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div>• 90% - 100%: Outstanding (Grade A+)</div>
                    <div>• 80% - 89%: Exceeds Expectations (Grade A)</div>
                    <div>• 70% - 79%: Meets Expectations (Grade B)</div>
                    <div>• Below 70%: Needs Targeted Improvement (Grade C)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Qualitative Assessment & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="py-3 px-5 bg-muted/20 border-b">
                <CardTitle className="text-xs font-bold">Special Initiatives & Key Contributions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs text-muted-foreground">
                <p>
                  Demonstrated exemplary dedication in leading the cross-functional module rollout, championing test automation, and actively mentoring junior team members during quarterly sprint retrospectives.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="py-3 px-5 bg-muted/20 border-b">
                <CardTitle className="text-xs font-bold">Reporting Officer Evaluation & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs text-muted-foreground">
                <p>{activeScorecard.remarks}</p>
              </CardContent>
            </Card>
          </div>

          {/* Card 6: Official Sign-off & Signatures Block */}
          <Card className="border border-border/70 shadow-sm bg-muted/10">
            <CardContent className="p-6">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">
                Official Certification & Signatures
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs">
                <div className="border-t border-border pt-3">
                  <div className="font-bold text-foreground">{activeScorecard.employee.name}</div>
                  <div className="text-[11px] text-muted-foreground">Appraisee Signature</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Date: {new Date(activeScorecard.appraisalDate).toLocaleDateString()}</div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="font-bold text-foreground">{activeScorecard.employee.managerName}</div>
                  <div className="text-[11px] text-muted-foreground">Reporting Officer (RO) Signature</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Date: {new Date(activeScorecard.appraisalDate).toLocaleDateString()}</div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="font-bold text-foreground">Executive Management</div>
                  <div className="text-[11px] text-muted-foreground">Head of Department / Director</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Status: Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
