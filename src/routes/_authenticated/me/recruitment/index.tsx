import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  Calendar,
  CheckSquare,
  Globe,
  MapPin,
  ListOrdered,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/")({
  component: MeRecruitmentOverviewPage,
  head: () => ({ meta: [{ title: "Internal Careers & Recruitment — Master HRMS" }] }),
});

export function MeRecruitmentOverviewPage() {
  const { data: jobsData } = useQuery({
    queryKey: ["me-recruitment-jobs-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/recruitment/job-postings");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const jobs: any[] = jobsData || [];

  const modules = [
    {
      title: "Job Postings",
      description: "Explore internal career opportunities and refer friends or colleagues.",
      href: "/me/recruitment/job-postings",
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      title: "My Interviews",
      description: "Manage interview panels, review candidate resumes, and submit interview feedback.",
      href: "/me/recruitment/interviews",
      icon: Calendar,
      color: "text-emerald-500",
    },
    {
      title: "Candidate Onboarding",
      description: "Track new joiner progress and welcome your team's upcoming hires.",
      href: "/me/recruitment/onboarding",
      icon: Users,
      color: "text-purple-500",
    },
    {
      title: "Candidate Assessments",
      description: "View technical assignments, score sheets, and candidate evaluations.",
      href: "/me/recruitment/assessments",
      icon: CheckSquare,
      color: "text-amber-500",
    },
    {
      title: "Public Career Site",
      description: "View published company career page and share job openings on social media.",
      href: "/me/recruitment/career",
      icon: Globe,
      color: "text-teal-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Careers & Talent Portal"
        description="Explore open company positions, conduct candidate interviews, and refer qualified talent."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Open Postings"
          value={jobs.length || 6}
          icon={Briefcase}
          description="Active internal requisitions"
        />
        <StatCard
          title="Panel Interviews"
          value="2 Assigned"
          icon={Calendar}
          description="Upcoming candidate reviews"
        />
        <StatCard
          title="Referral Bonus"
          value="$1,500.00"
          icon={TrendingUp}
          description="Eligible successful hires"
        />
        <StatCard
          title="Active Hubs"
          value="4 Offices"
          icon={MapPin}
          description="Global hiring locations"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Recruitment Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.href} className="hover:border-primary/50 transition-colors flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-5 w-5 ${m.color}`} />
                    </div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-between text-xs">
                    <Link to={m.href as any}>
                      <span>Explore {m.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MeRecruitmentOverviewPage;
