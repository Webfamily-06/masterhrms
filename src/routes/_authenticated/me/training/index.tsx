import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/training/")({
  component: MeTrainingOverviewPage,
  head: () => ({ meta: [{ title: "My Training & Courses — Master HRMS" }] }),
});

export function MeTrainingOverviewPage() {
  const { data: trainingsData } = useQuery({
    queryKey: ["me-trainings-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/training/trainings");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const trainings: any[] = trainingsData || [];

  const modules = [
    {
      title: "My Enrolled Trainings",
      description: "Track your active courses, self-paced modules, completion progress, and certificates.",
      href: "/me/training/trainings",
      icon: GraduationCap,
      color: "text-blue-500",
    },
    {
      title: "Training Sessions",
      description: "View scheduled instructor-led classrooms, webinars, and mark your attendance.",
      href: "/me/training/sessions",
      icon: Calendar,
      color: "text-emerald-500",
    },
    {
      title: "Training Programs",
      description: "Explore mandatory corporate curricula, onboarding paths, and leadership tracks.",
      href: "/me/training/programs",
      icon: Layers,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning & Professional Development"
        description="Upskill your career with company-sponsored training programs, live webinars, and certifications."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Active Trainings"
          value={trainings.length || 2}
          icon={GraduationCap}
          description="Enrolled courses in progress"
        />
        <StatCard
          title="Upcoming Sessions"
          value="1 Webinar"
          icon={Calendar}
          description="Scheduled this week"
        />
        <StatCard
          title="Completed"
          value="5 Courses"
          icon={CheckCircle2}
          description="Certificates earned"
        />
        <StatCard
          title="Hours Completed"
          value="34 Hours"
          icon={Clock}
          description="Learning credits accrued"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Training Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

export default MeTrainingOverviewPage;
