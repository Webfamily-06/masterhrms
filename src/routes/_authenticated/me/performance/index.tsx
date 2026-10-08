import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Award,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/performance/")({
  component: MePerformanceHubPage,
});

export default function MePerformanceHubPage() {
  const { data: goals = [] } = useQuery({
    queryKey: ["me-performance-goals"],
    queryFn: async () => {
      const res = await api.get("/me/performance/goals");
      return res.data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["me-performance-reviews"],
    queryFn: async () => {
      const res = await api.get("/me/performance/reviews");
      return res.data;
    },
  });

  const completedGoals = goals.filter((g: any) => g.status === "completed");
  const pendingSelfAssessments = reviews.filter((r: any) => !r.selfScore && r.status !== "finalized");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance & Appraisal Hub"
        description="Track your corporate OKRs, log milestone check-ins, complete self-assessments, and review finalized performance appraisals."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Goals / OKRs"
          value={goals.length.toString()}
          icon={<Target className="h-5 w-5 text-indigo-500" />}
          description="Corporate deliverables"
        />
        <StatCard
          title="Goals Completed"
          value={completedGoals.length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="100% achieved"
        />
        <StatCard
          title="Pending Self-Reviews"
          value={pendingSelfAssessments.length.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="Awaiting your input"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" /> My Goals & OKR Check-ins
              </CardTitle>
            </div>
            <CardDescription>
              View key results assigned to you, report milestone progress values, and update completion percentages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/performance/goals">
                View My Goals <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Appraisals & Self-Assessment
              </CardTitle>
            </div>
            <CardDescription>
              Submit self-evaluation scores for active appraisal cycles and view manager ratings once released.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/performance/reviews">
                View Appraisals <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
