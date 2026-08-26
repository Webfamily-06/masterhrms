import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAddon } from "@/hooks/use-addon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Search,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Zap,
  Building2,
  Lock,
  ArrowRight,
  Sliders,
  Send,
  GitFork,
  CheckSquare,
  ListOrdered,
  HelpCircle,
  Smile,
  Meh,
  Frown,
  Eye,
  FileText,
  Percent,
  DollarSign,
  Hash,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/okr")({
  component: OkrPerformancePage,
  head: () => ({ meta: [{ title: "OKR & Performance — Master Workspace" }] }),
});

export function OkrPerformancePage() {
  const queryClient = useQueryClient();
  const { isEntitled, isTrial, trialDaysLeft, startTrial, isStartingTrial, subscribe, isSubscribing } =
    useAddon("okr-performance");

  const [activeTab, setActiveTab] = useState("list");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");
  const [alignmentFilter, setAlignmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);

  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [selectedKr, setSelectedKr] = useState<any>(null);

  // Form states
  const [objForm, setObjForm] = useState({
    title: "",
    description: "",
    ownerId: "",
    cycleId: "",
    parentId: "",
    category: "Strategy",
    alignmentType: "individual",
    keyResults: [
      { title: "Deliver primary milestone deliverables", startValue: 0, targetValue: 100, measurementType: "percentage", weight: 1.0 },
      { title: "Attain customer feedback score >= 90%", startValue: 0, targetValue: 90, measurementType: "percentage", weight: 1.0 },
    ],
  });

  const [checkinForm, setCheckinForm] = useState({
    progressValue: 50,
    confidenceScore: 8,
    notes: "",
    blockers: "",
  });

  const [reviewForm, setReviewForm] = useState({
    cycleId: "",
    employeeId: "",
    reviewerId: "",
    reviewType: "manager",
    ratingScore: 4.5,
    feedbackText: "",
  });

  const [cycleForm, setCycleForm] = useState({
    name: "",
    periodType: "quarterly",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  });

  // Queries
  const { data: cyclesData } = useQuery({
    queryKey: ["okr-cycles"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/okr/cycles");
        return res?.cycles || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: objectivesData, refetch: refetchObjectives } = useQuery({
    queryKey: ["okr-objectives", selectedCycleId, alignmentFilter, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCycleId && selectedCycleId !== "all") params.append("cycleId", selectedCycleId);
        if (alignmentFilter && alignmentFilter !== "all") params.append("alignmentType", alignmentFilter);

        const res = await api.get(`/addons/okr/objectives?${params.toString()}`);
        return res;
      } catch {
        return { objectives: [], summary: {} };
      }
    },
    enabled: isEntitled,
  });

  const { data: treeData } = useQuery({
    queryKey: ["okr-tree", selectedCycleId],
    queryFn: async () => {
      try {
        const url = selectedCycleId && selectedCycleId !== "all" ? `/addons/okr/tree?cycleId=${selectedCycleId}` : "/addons/okr/tree";
        const res = await api.get(url);
        return res?.tree || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled && activeTab === "tree",
  });

  const { data: checkinsData, refetch: refetchCheckins } = useQuery({
    queryKey: ["okr-checkins"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/okr/checkins");
        return res?.checkins || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled && activeTab === "checkins",
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["okr-reviews"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/okr/reviews");
        return res;
      } catch {
        return { reviews: [], summary: {} };
      }
    },
    enabled: isEntitled && activeTab === "reviews",
  });

  const { data: employeesList } = useQuery({
    queryKey: ["active-employees-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createObjMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: objForm.title,
        description: objForm.description,
        ownerId: objForm.ownerId,
        cycleId: objForm.cycleId || cyclesData?.[0]?.id,
        parentId: objForm.parentId || null,
        category: objForm.category,
        alignmentType: objForm.alignmentType,
        keyResults: objForm.keyResults.filter((kr) => kr.title.trim() !== ""),
      };
      return await api.post("/addons/okr/objectives", payload);
    },
    onSuccess: () => {
      toast.success("Objective and Key Results created!");
      setIsObjModalOpen(false);
      refetchObjectives();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create objective"),
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/okr/checkins", {
        keyResultId: selectedKr?.id,
        employeeId: selectedKr?.objective?.ownerId || employeesList?.[0]?.id,
        progressValue: checkinForm.progressValue,
        confidenceScore: checkinForm.confidenceScore,
        notes: checkinForm.notes,
        blockers: checkinForm.blockers,
      });
    },
    onSuccess: () => {
      toast.success("Check-in submitted & weighted progress updated!");
      setIsCheckinModalOpen(false);
      refetchObjectives();
      if (activeTab === "checkins") refetchCheckins();
    },
    onError: (e: any) => toast.error(e.message || "Failed to record checkin"),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/okr/reviews", {
        cycleId: reviewForm.cycleId || cyclesData?.[0]?.id,
        employeeId: reviewForm.employeeId,
        reviewerId: reviewForm.reviewerId,
        reviewType: reviewForm.reviewType,
        ratingScore: Number(reviewForm.ratingScore),
        feedbackText: reviewForm.feedbackText,
      });
    },
    onSuccess: () => {
      toast.success("Performance review submitted!");
      setIsReviewModalOpen(false);
      refetchReviews();
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit review"),
  });

  const createCycleMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/okr/cycles", cycleForm);
    },
    onSuccess: () => {
      toast.success("New Review Cycle created!");
      setIsCycleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to create cycle"),
  });

  // ─── ADDON GUARD: If Tenant is NOT subscribed / active ───
  if (!isEntitled) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <Card className="border-2 border-dashed border-primary/30 p-8 text-center bg-card shadow-sm space-y-6">
          <div className="size-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center mx-auto shadow-xs">
            <Target className="size-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider border-indigo-500/30 text-indigo-600">
                Enterprise Add-on
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Objectives & Key Results (OKR) Platform
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fast-cadence quarterly goal setting, cascading alignment hierarchy (Company → Department → Team),
              live progress check-in sliders, and multi-rater 360° reviews.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left text-xs">
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <GitFork className="size-3.5 text-indigo-500" /> Cascading Alignment
              </span>
              <p className="text-[11px] text-muted-foreground">
                Company vision cascades down to departments and individual contributors.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="size-3.5 text-emerald-500" /> Fast-Cadence Check-ins
              </span>
              <p className="text-[11px] text-muted-foreground">
                Confidence scoring (1-10), blocker notes, and auto-weighted progress metrics.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Award className="size-3.5 text-amber-500" /> 360° Appraisals
              </span>
              <p className="text-[11px] text-muted-foreground">
                Quarterly performance appraisals, feedback, and talent rating bell curves.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => startTrial()}
              disabled={isStartingTrial}
              className="gap-2 text-xs font-bold h-9 shadow-sm"
            >
              <Zap className="size-3.5" />
              <span>Start 14-Day Free Trial</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => subscribe("pro_annual")}
              disabled={isSubscribing}
              className="gap-2 text-xs font-semibold h-9 shadow-2xs"
            >
              <span>Subscribe ($49/mo)</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const rawObjectives = objectivesData?.objectives || [];
  const objSummary = objectivesData?.summary || {};
  const treeNodes = treeData || [];
  const checkinsList = checkinsData || [];
  const reviews = reviewsData?.reviews || [];
  const revSummary = reviewsData?.summary || {};

  const filteredObjectives = rawObjectives.filter((o: any) =>
    searchQuery ? o.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="space-y-5 max-w-full pb-8">
      {/* ─── 1. COMPACT ENTERPRISE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              <Target className="size-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Objectives & Key Results (OKR)</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-600 bg-indigo-500/5">
              {isTrial ? "Trial Active" : "Add-on Active"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Align company, department, and individual goals with weekly check-ins and performance evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCycleModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <Calendar className="size-3.5 text-indigo-500" />
            <span>New Cycle</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsReviewModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <Award className="size-3.5 text-amber-500" />
            <span>Start Review</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setObjForm({
                title: "",
                description: "",
                ownerId: employeesList?.[0]?.id || "",
                cycleId: cyclesData?.[0]?.id || "",
                parentId: "",
                category: "Strategy",
                alignmentType: "individual",
                keyResults: [
                  { title: "Deliver primary milestone deliverables", startValue: 0, targetValue: 100, measurementType: "percentage", weight: 1.0 },
                  { title: "Attain customer feedback score >= 90%", startValue: 0, targetValue: 90, measurementType: "percentage", weight: 1.0 },
                ],
              });
              setIsObjModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>Create OKR</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. COMPACT 4-COLUMN KPI ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Objectives
            </span>
            <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 grid place-items-center">
              <Target className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {objSummary.totalObjectives ?? 0}
            </span>
            <span className="text-[11px] font-medium text-indigo-600">
              {objSummary.inProgressCount ?? 0} In Progress
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Average Progress
            </span>
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
              <TrendingUp className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {objSummary.averageProgress ?? 0}%
            </span>
            <span className="text-[11px] font-medium text-emerald-600">
              {objSummary.achievedCount ?? 0} Achieved
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Check-ins
            </span>
            <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 grid place-items-center">
              <Sliders className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {checkinsList.length}
            </span>
            <span className="text-[11px] font-medium text-blue-600">
              Cadence Active
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Appraisal Score
            </span>
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center">
              <Award className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {revSummary.averageScore ?? "0.0"} / 5.0
            </span>
            <span className="text-[11px] font-medium text-amber-600">
              {revSummary.completedCount ?? 0} Reviewed
            </span>
          </div>
        </Card>
      </div>

      {/* ─── 3. SUB-TABS NAVIGATION ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-1">
          <TabsList className="bg-muted/40 h-8 p-0.5 overflow-x-auto flex-nowrap">
            <TabsTrigger value="list" className="text-xs h-7">
              List of OKRs ({filteredObjectives.length})
            </TabsTrigger>
            <TabsTrigger value="tree" className="text-xs h-7">
              Hierarchical Tree
            </TabsTrigger>
            <TabsTrigger value="checkins" className="text-xs h-7">
              List of Check-ins ({checkinsList.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs h-7">
              360° Appraisals ({revSummary.totalReviews ?? 0})
            </TabsTrigger>
            <TabsTrigger value="cycles" className="text-xs h-7">
              Cycles & Criteria ({cyclesData?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Cycle & Alignment Filters */}
          <div className="flex items-center gap-2">
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue placeholder="All Cycles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Cycles</SelectItem>
                {cyclesData?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={alignmentFilter} onValueChange={setAlignmentFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Alignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alignments</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ===================== TAB 1: LIST OF OKRs ===================== */}
        <TabsContent value="list" className="space-y-3">
          <Card className="p-3 border shadow-2xs bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search objective title or key results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Showing {filteredObjectives.length} OKRs
            </span>
          </Card>

          {filteredObjectives.length > 0 ? (
            <div className="space-y-3">
              {filteredObjectives.map((obj: any) => (
                <Card key={obj.id} className="p-4 border shadow-2xs bg-card space-y-3 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-mono px-1.5 py-0 border-indigo-500/30 text-indigo-600 bg-indigo-500/10"
                        >
                          {obj.alignmentType}
                        </Badge>
                        {obj.category && (
                          <Badge variant="secondary" className="text-[9px] font-mono">
                            {obj.category}
                          </Badge>
                        )}
                        <h3 className="font-bold text-sm text-foreground truncate">{obj.title}</h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Owner: <span className="font-semibold text-foreground">{obj.owner?.firstName} {obj.owner?.lastName}</span> ({obj.owner?.position || "Staff"})
                        {obj.parent && (
                          <span className="ml-2 text-indigo-500">
                            ↳ Aligned to: {obj.parent.title}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-foreground">{Number(obj.progress)}%</span>
                        <span className="text-[9px] text-muted-foreground block font-mono">Weighted Total</span>
                      </div>
                      <div className="w-24">
                        <Progress value={Number(obj.progress)} className="h-2" />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedObjective(obj);
                          setIsDetailModalOpen(true);
                        }}
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Key Results list */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Key Results ({obj.keyResults?.length ?? 0})
                      </span>
                    </div>

                    <div className="grid gap-2">
                      {obj.keyResults?.map((kr: any) => {
                        const start = Number(kr.startValue);
                        const target = Number(kr.targetValue);
                        const current = Number(kr.currentValue);
                        const span = target - start || 1;
                        const pct = Math.min(100, Math.max(0, Math.round(((current - start) / span) * 100)));

                        return (
                          <div
                            key={kr.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs gap-2"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span className="font-semibold text-foreground truncate block">
                                {kr.title}
                              </span>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                                <span>Target: {target}</span>
                                <span>Current: {current} {kr.measurementType}</span>
                                <span className="font-bold text-primary">{pct}% Complete</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedKr({ ...kr, objective: obj });
                                  setCheckinForm({
                                    progressValue: Number(kr.currentValue),
                                    confidenceScore: 8,
                                    notes: "",
                                    blockers: "",
                                  });
                                  setIsCheckinModalOpen(true);
                                }}
                                className="h-7 text-xs gap-1 font-semibold shadow-2xs"
                              >
                                <Sliders className="size-3" />
                                <span>Check-in</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed space-y-3">
              <Target className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No objectives registered for this cycle.</p>
              <Button size="sm" onClick={() => setIsObjModalOpen(true)} className="text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1.5" /> Create First OKR
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ===================== TAB 2: HIERARCHICAL TREE ===================== */}
        <TabsContent value="tree" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-4">
            <div className="border-b pb-2.5">
              <h3 className="font-bold text-sm text-foreground">Cascading Goal Alignment Tree</h3>
              <p className="text-[11px] text-muted-foreground">
                Company vision cascades into Department Objectives and Individual contributor goals.
              </p>
            </div>

            {treeNodes.length > 0 ? (
              <div className="space-y-4">
                {treeNodes.map((rootObj: any) => (
                  <div key={rootObj.id} className="p-3.5 rounded-xl border bg-indigo-500/5 border-indigo-500/20 space-y-3">
                    {/* Root node */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[9px] uppercase font-mono bg-indigo-600 text-white">
                            {rootObj.alignmentType}
                          </Badge>
                          <span className="font-bold text-sm text-foreground">{rootObj.title}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          Leader: {rootObj.owner?.firstName} {rootObj.owner?.lastName} · Progress: {Number(rootObj.progress)}%
                        </span>
                      </div>
                      <div className="w-24">
                        <Progress value={Number(rootObj.progress)} className="h-2" />
                      </div>
                    </div>

                    {/* Children branch */}
                    {rootObj.children?.length > 0 && (
                      <div className="pl-4 border-l-2 border-indigo-300 dark:border-indigo-800 space-y-2 pt-1">
                        {rootObj.children.map((child: any) => (
                          <div key={child.id} className="p-2.5 rounded-lg border bg-card text-xs flex items-center justify-between">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  {child.alignmentType}
                                </Badge>
                                <span className="font-semibold text-foreground truncate">{child.title}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Owner: {child.owner?.firstName} {child.owner?.lastName}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-primary text-[11px] shrink-0">
                              {Number(child.progress)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <GitFork className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No hierarchical OKR branches created yet.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: LIST OF CHECK-INS ===================== */}
        <TabsContent value="checkins" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="border-b pb-2.5">
              <h3 className="font-bold text-sm text-foreground">Weekly Check-in Submissions</h3>
              <p className="text-[11px] text-muted-foreground">
                Audited milestone progression, confidence index (1-10), blocker reports, and remarks.
              </p>
            </div>

            {checkinsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                      <th className="pb-2 text-left">Date</th>
                      <th className="pb-2 text-left">Staff Member</th>
                      <th className="pb-2 text-left">Key Result & Objective</th>
                      <th className="pb-2 text-left">Confidence</th>
                      <th className="pb-2 text-left">Progress Value</th>
                      <th className="pb-2 text-left">Remarks & Blockers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {checkinsList.map((chk: any) => (
                      <tr key={chk.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(chk.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold text-foreground whitespace-nowrap">
                          {chk.employee?.firstName} {chk.employee?.lastName}
                        </td>
                        <td className="py-2.5 max-w-xs">
                          <span className="font-semibold text-foreground block truncate">
                            {chk.keyResult?.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Obj: {chk.keyResult?.objective?.title}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Badge
                            className={`text-[10px] font-mono font-bold ${
                              chk.confidenceScore >= 8
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : chk.confidenceScore >= 5
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            ⭐ {chk.confidenceScore}/10
                          </Badge>
                        </td>
                        <td className="py-2.5 font-mono font-bold text-primary">
                          {chk.progressValue} {chk.keyResult?.measurementType}
                        </td>
                        <td className="py-2.5 text-muted-foreground max-w-xs truncate">
                          {chk.blockers ? (
                            <span className="text-rose-600 font-semibold">[Blocker: {chk.blockers}] </span>
                          ) : null}
                          {chk.notes || "Standard progress check-in."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Sliders className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No check-in logs submitted yet.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: 360° APPRAISALS ===================== */}
        <TabsContent value="reviews" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">360° Appraisal & Rating Evaluations</h3>
                <p className="text-[11px] text-muted-foreground">
                  Multi-rater evaluations, self-appraisals, and performance scores on a 5.0 scale.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsReviewModalOpen(true)} className="h-7 text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1" /> New Review
              </Button>
            </div>

            {reviews.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                      <th className="pb-2 text-left">Staff Member</th>
                      <th className="pb-2 text-left">Reviewer</th>
                      <th className="pb-2 text-left">Type</th>
                      <th className="pb-2 text-left">Rating Score</th>
                      <th className="pb-2 text-left">Feedback Remarks</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {reviews.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-semibold text-foreground">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {r.reviewer?.firstName} {r.reviewer?.lastName}
                        </td>
                        <td className="py-2.5">
                          <Badge variant="secondary" className="text-[9px] uppercase font-mono">
                            {r.reviewType}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-bold text-amber-600 font-mono">
                          ⭐ {Number(r.ratingScore).toFixed(1)} / 5.0
                        </td>
                        <td className="py-2.5 text-muted-foreground truncate max-w-xs">
                          {r.feedbackText || "Constructive feedback recorded."}
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Award className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No 360° performance reviews submitted yet.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 5: CYCLES & SETTINGS ===================== */}
        <TabsContent value="cycles" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">Review Cycles & Cadence Configuration</h3>
                <p className="text-[11px] text-muted-foreground">
                  Establish quarterly/annual appraisal windows and check-in evaluation criteria.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsCycleModalOpen(true)} className="h-7 text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1" /> Create Cycle
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cyclesData?.map((c: any) => (
                <div key={c.id} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{c.name}</span>
                    <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-500/30">
                      {c.periodType}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                    <Calendar className="size-3" />
                    <span>
                      {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>{c._count?.objectives || 0} Objectives</span>
                    <span>{c._count?.reviews || 0} Reviews</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: Create OKR (Objective + Key Results Builder) ─── */}
      <Dialog open={isObjModalOpen} onOpenChange={setIsObjModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="size-4 text-indigo-600" />
              <span>Create New Objective & Key Results</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Objectives should be memorable and qualitative; Key Results must be measurable (2 to 5 KRs).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Objective Title (Inspirational Goal) *</Label>
              <Input
                placeholder="e.g. Accelerate global enterprise ARR growth to $10M"
                value={objForm.title}
                onChange={(e) => setObjForm({ ...objForm, title: e.target.value })}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Goal Alignment</Label>
                <Select
                  value={objForm.alignmentType}
                  onValueChange={(v) => setObjForm({ ...objForm, alignmentType: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company Level</SelectItem>
                    <SelectItem value="department">Department Level</SelectItem>
                    <SelectItem value="individual">Individual Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Goal Owner *</Label>
                <Select
                  value={objForm.ownerId}
                  onValueChange={(v) => setObjForm({ ...objForm, ownerId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category / Pillar</Label>
                <Select
                  value={objForm.category}
                  onValueChange={(v) => setObjForm({ ...objForm, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strategy">Strategy</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Sales">Sales & Revenue</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parent Objective for Cascading Alignment */}
            {rawObjectives.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Align with Parent Objective (Optional)</Label>
                <Select
                  value={objForm.parentId}
                  onValueChange={(v) => setObjForm({ ...objForm, parentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Parent Goal (Cascading Alignment)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent (Root Objective)</SelectItem>
                    {rawObjectives.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        [{o.alignmentType.toUpperCase()}] {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dynamic Key Results Builder */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Measurable Key Results ({objForm.keyResults.length}/5)
                </Label>
                {objForm.keyResults.length < 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setObjForm({
                        ...objForm,
                        keyResults: [
                          ...objForm.keyResults,
                          { title: "", startValue: 0, targetValue: 100, measurementType: "percentage", weight: 1.0 },
                        ],
                      })
                    }
                    className="h-6 text-[10px] font-bold"
                  >
                    <Plus className="size-3 mr-1" /> Add Key Result
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {objForm.keyResults.map((kr, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[10px] text-primary">KR #{idx + 1}</span>
                      <Input
                        placeholder={`e.g. KR #${idx + 1} specific quantifiable metric`}
                        value={kr.title}
                        onChange={(e) => {
                          const updated = [...objForm.keyResults];
                          updated[idx].title = e.target.value;
                          setObjForm({ ...objForm, keyResults: updated });
                        }}
                        className="h-7 text-xs flex-1"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Metric Type</Label>
                        <Select
                          value={kr.measurementType}
                          onValueChange={(v) => {
                            const updated = [...objForm.keyResults];
                            updated[idx].measurementType = v;
                            setObjForm({ ...objForm, keyResults: updated });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="number">Numeric (Count)</SelectItem>
                            <SelectItem value="currency">Currency ($/₹)</SelectItem>
                            <SelectItem value="boolean">Milestone (Done/Not Done)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Target Value</Label>
                        <Input
                          type="number"
                          value={kr.targetValue}
                          onChange={(e) => {
                            const updated = [...objForm.keyResults];
                            updated[idx].targetValue = Number(e.target.value);
                            setObjForm({ ...objForm, keyResults: updated });
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Weight (1.0 = standard)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={kr.weight}
                          onChange={(e) => {
                            const updated = [...objForm.keyResults];
                            updated[idx].weight = Number(e.target.value);
                            setObjForm({ ...objForm, keyResults: updated });
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsObjModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createObjMutation.mutate()}
              disabled={createObjMutation.isPending || !objForm.title || !objForm.ownerId}
              className="text-xs font-bold shadow-2xs"
            >
              Create OKR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Live Structured Check-in ─── */}
      <Dialog open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sliders className="size-4 text-emerald-600" />
              <span>Key Result Check-in & Evaluation</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update your progress metric and provide confidence rating and blocker notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-xl border bg-muted/20 space-y-0.5">
              <span className="font-semibold text-foreground block">{selectedKr?.title}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Target: {Number(selectedKr?.targetValue)} {selectedKr?.measurementType}
              </span>
            </div>

            {/* Question 1: Progress Slider / Input */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs font-semibold">1. Current Progress Value</Label>
                <span className="font-mono font-bold text-primary">{checkinForm.progressValue}</span>
              </div>
              <Input
                type="number"
                value={checkinForm.progressValue}
                onChange={(e) => setCheckinForm({ ...checkinForm, progressValue: Number(e.target.value) })}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            {/* Question 2: Confidence Rating (1-10) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">2. Confidence Index (1-10)</Label>
                <span className="text-[11px] font-bold font-mono text-emerald-600">
                  ⭐ {checkinForm.confidenceScore} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={checkinForm.confidenceScore}
                onChange={(e) => setCheckinForm({ ...checkinForm, confidenceScore: Number(e.target.value) })}
                className="w-full cursor-pointer accent-primary"
              />
            </div>

            {/* Question 3: Achievements Remarks */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">3. Key Milestones Achieved This Week</Label>
              <Textarea
                placeholder="What specific deliverables were accomplished?"
                value={checkinForm.notes}
                onChange={(e) => setCheckinForm({ ...checkinForm, notes: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Question 4: Blockers & Risks */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">4. Impediments / Blockers (Optional)</Label>
              <Textarea
                placeholder="Any dependencies or roadblocks requiring leadership attention?"
                value={checkinForm.blockers}
                onChange={(e) => setCheckinForm({ ...checkinForm, blockers: e.target.value })}
                rows={2}
                className="text-xs resize-none text-rose-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsCheckinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending}
              className="text-xs font-bold shadow-2xs"
            >
              Submit Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Single OKR Detail Passport ─── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="size-4 text-indigo-600" />
              <span>OKR Passport & Metrics Breakdown</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl border bg-muted/10 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedObjective?.alignmentType?.toUpperCase()}
                </Badge>
                <h3 className="font-bold text-sm text-foreground">{selectedObjective?.title}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Owner: {selectedObjective?.owner?.firstName} {selectedObjective?.owner?.lastName} · Cycle: {selectedObjective?.cycleId || "Current"}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Progress value={Number(selectedObjective?.progress || 0)} className="h-2 flex-1" />
                <span className="font-mono font-bold">{Number(selectedObjective?.progress || 0)}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                Key Results & Weights
              </span>
              <div className="space-y-1.5">
                {selectedObjective?.keyResults?.map((kr: any) => (
                  <div key={kr.id} className="p-2 rounded-lg border bg-card flex justify-between items-center text-[11px]">
                    <span className="font-medium text-foreground">{kr.title}</span>
                    <span className="font-mono font-bold text-primary">
                      {kr.currentValue} / {kr.targetValue} {kr.measurementType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: 360 Appraisal Rating ─── */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Submit 360° Appraisal Review</DialogTitle>
            <DialogDescription className="text-xs">
              Provide constructive evaluation and a score rating on a 5.0 scale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee</Label>
                <Select
                  value={reviewForm.employeeId}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, employeeId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Reviewer</Label>
                <Select
                  value={reviewForm.reviewerId}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, reviewerId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rating Score (1.0 — 5.0)</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={reviewForm.ratingScore}
                onChange={(e) => setReviewForm({ ...reviewForm, ratingScore: Number(e.target.value) })}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Feedback & Appraisal Remarks</Label>
              <Textarea
                placeholder="Detail accomplishments, core strengths, and growth areas..."
                value={reviewForm.feedbackText}
                onChange={(e) => setReviewForm({ ...reviewForm, feedbackText: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending || !reviewForm.employeeId || !reviewForm.reviewerId}
              className="text-xs font-bold shadow-2xs"
            >
              Submit Appraisal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: Create Cycle ─── */}
      <Dialog open={isCycleModalOpen} onOpenChange={setIsCycleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Create Review Cycle</DialogTitle>
            <DialogDescription className="text-xs">
              Establish a quarterly or annual appraisal window for organization OKRs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cycle Name</Label>
              <Input
                placeholder="e.g. Q4 2026 Growth & Strategy Cycle"
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={cycleForm.startDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={cycleForm.endDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsCycleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createCycleMutation.mutate()}
              disabled={createCycleMutation.isPending || !cycleForm.name}
              className="text-xs font-bold shadow-2xs"
            >
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
