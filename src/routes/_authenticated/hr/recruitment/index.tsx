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
  Gift,
  UserCheck,
  CheckSquare,
  ClipboardList,
  Globe,
  Layers,
  MapPin,
  ListOrdered,
  FileText,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/")({
  component: HrRecruitmentOverviewPage,
  head: () => ({ meta: [{ title: "Talent Acquisition & Recruitment — Master HRMS" }] }),
});

export function HrRecruitmentOverviewPage() {
  const { data: jobsData } = useQuery({
    queryKey: ["hr-recruitment-jobs-overview"],
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
      description: "Create and publish job requisitions, track vacancy lifecycles and budgets.",
      href: "/hr/recruitment/job-postings",
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      title: "Candidate Pipeline",
      description: "Manage applicants, resumes, candidate stages, and talent pool tags.",
      href: "/hr/recruitment/candidates",
      icon: Users,
      color: "text-emerald-500",
    },
    {
      title: "Interviews",
      description: "Schedule panels, record scorecard ratings, and collect interviewer feedback.",
      href: "/hr/recruitment/interviews",
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      title: "Job Offers",
      description: "Generate compensation letters, track e-signatures, and manage acceptances.",
      href: "/hr/recruitment/offers",
      icon: Gift,
      color: "text-amber-500",
    },
    {
      title: "Candidate Onboarding",
      description: "Automate pre-boarding paperwork, IT provisioning, and orientation check-ins.",
      href: "/hr/recruitment/onboarding",
      icon: UserCheck,
      color: "text-teal-500",
    },
    {
      title: "Candidate Assessments",
      description: "Administer skill assessments, coding tests, and scoring rubrics.",
      href: "/hr/recruitment/assessments",
      icon: CheckSquare,
      color: "text-rose-500",
    },
    {
      title: "Onboarding Checklists",
      description: "Define departmental onboarding checklists and assign accountable owners.",
      href: "/hr/recruitment/onboarding-checklists",
      icon: ClipboardList,
      color: "text-indigo-500",
    },
    {
      title: "Career Site",
      description: "Customize the public career portal branding, benefits, and open listings.",
      href: "/hr/recruitment/career",
      icon: Globe,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent Acquisition & Hiring Dashboard"
        description="End-to-end recruitment lifecycle from job posting and sourcing to interview evaluation and onboarding."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Active Requisitions"
          value={jobs.length || 14}
          icon={Briefcase}
          description="Open job vacancies"
        />
        <StatCard
          title="Candidates in Pipeline"
          value="182 Total"
          icon={Users}
          description="Across screening & interview"
        />
        <StatCard
          title="Offer Acceptance"
          value="91.2%"
          icon={TrendingUp}
          description="High conversion rate"
        />
        <StatCard
          title="Time to Hire"
          value="24 Days"
          icon={Calendar}
          description="Industry benchmark: 35 days"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Recruitment Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <span>Open {m.title}</span>
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

export default HrRecruitmentOverviewPage;
