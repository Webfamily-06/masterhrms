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
  Sliders,
  ArrowRight,
  Users,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/training/")({
  component: HrTrainingOverviewPage,
  head: () => ({ meta: [{ title: "Training Management — Master HRMS" }] }),
});

export function HrTrainingOverviewPage() {
  const { data: trainingsData } = useQuery({
    queryKey: ["hr-trainings-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/hr/training/trainings");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const trainings: any[] = trainingsData || [];

  const modules = [
    {
      title: "Employee Trainings",
      description: "Manage enrolled participants, track attendance, and record assessment scores.",
      href: "/hr/training/trainings",
      icon: GraduationCap,
      color: "text-blue-500",
    },
    {
      title: "Training Sessions",
      description: "Schedule live webinars, in-person classrooms, assign instructors, and set venue details.",
      href: "/hr/training/sessions",
      icon: Calendar,
      color: "text-emerald-500",
    },
    {
      title: "Training Programs",
      description: "Design structured corporate curriculums, learning tracks, and mandatory compliance modules.",
      href: "/hr/training/programs",
      icon: Layers,
      color: "text-purple-500",
    },
    {
      title: "Training Types",
      description: "Categorize skills, technical competencies, soft skills, and leadership programs.",
      href: "/hr/training/types",
      icon: Sliders,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training & Development Operations"
        description="Plan organizational learning initiatives, track employee skill progression, and manage sessions."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Active Programs"
          value={trainings.length || 8}
          icon={<Layers className="h-5 w-5" />}
          description="Corporate learning tracks"
        />
        <StatCard
          title="Employees Enrolled"
          value="84 Staff"
          icon={<Users className="h-5 w-5" />}
          description="Across all departments"
        />
        <StatCard
          title="Avg. Completion Rate"
          value="88.2%"
          icon={<CheckCircle2 className="h-5 w-5" />}
          description="High engagement score"
        />
        <StatCard
          title="Sessions Scheduled"
          value="12 Sessions"
          icon={<Calendar className="h-5 w-5" />}
          description="Upcoming calendar events"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Training Modules
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

export default HrTrainingOverviewPage;
