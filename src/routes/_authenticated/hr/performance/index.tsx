import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/")({
  component: HrPerformanceDashboard,
});

export default function HrPerformanceDashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["hr-performance-overview"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/overview");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Management Command Center"
        description="Oversee corporate appraisal cycles, OKRs, KPI indicators, 5-point calibration rating engines, and PIP development pipelines."
      />

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Cycles"
          value={(overview?.activeCycles ?? 0).toString()}
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
          description="Open appraisal periods"
        />
        <StatCard
          title="Total Goals / OKRs"
          value={(overview?.totalGoals ?? 0).toString()}
          icon={<Target className="h-5 w-5 text-emerald-500" />}
          description="Tracked corporate objectives"
        />
        <StatCard
          title="Pending Reviews"
          value={(overview?.pendingReviews ?? 0).toString()}
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          description="Awaiting evaluation submission"
        />
        <StatCard
          title="Active PIPs"
          value={(overview?.activePips ?? 0).toString()}
          icon={<TrendingUp className="h-5 w-5 text-rose-500" />}
          description="Improvement plans ongoing"
        />
      </div>

      {/* QUICK WORKFLOW NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Appraisal Cycles
              </CardTitle>
              <Badge variant="outline">HR-PF-03</Badge>
            </div>
            <CardDescription>
              Create quarterly or annual cycles, advance review stages, and publish finalized results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/hr/performance/cycles">
                Manage Cycles <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" /> Goal Tracking & OKRs
              </CardTitle>
              <Badge variant="outline">HR-PF-02</Badge>
            </div>
            <CardDescription>
              Assign employee OKRs with target values, weights, and real-time check-in milestones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/hr/performance/goals">
                Track Goals <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Appraisals & Reviews
              </CardTitle>
              <Badge variant="outline">HR-PF-01</Badge>
            </div>
            <CardDescription>
              Conduct self-assessments, manager evaluations, and 5-point mathematical calibrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/hr/performance/reviews">
                Conduct Appraisals <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Competency Indicators
              </CardTitle>
              <Badge variant="outline">HR-PF-04</Badge>
            </div>
            <CardDescription>
              Define behavioural, technical, and leadership competencies evaluated during reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/hr/performance/indicators">
                Setup Indicators <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" /> Goal Types & Categories
              </CardTitle>
              <Badge variant="outline">HR-PF-05/06</Badge>
            </div>
            <CardDescription>
              Configure organizational taxonomies for strategic, departmental, and personal goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="w-1/2">
                <Link to="/hr/performance/goal-types">Goal Types</Link>
              </Button>
              <Button asChild variant="outline" className="w-1/2">
                <Link to="/hr/performance/indicator-categories">Categories</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" /> Performance Improvement (PIP)
              </CardTitle>
              <Badge variant="outline">HR-PF-07</Badge>
            </div>
            <CardDescription>
              Structured improvement plans with objective milestones, checkpoints, and outcome records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/hr/performance/pip">
                Manage PIPs <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
