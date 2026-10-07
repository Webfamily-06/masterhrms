import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Briefcase,
  Download,
  CheckCircle2,
  Clock,
  FolderKanban,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { StatCard } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/project-report")({
  component: ProjectReportPage,
  head: () => ({
    meta: [{ title: "Project Report — Master HRMS" }],
  }),
});

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  clientName: string;
  createdAt: string;
}

interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: string;
}

export function ProjectReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch Projects & Tasks
  const { data, isLoading } = useQuery({
    queryKey: ["projects-report", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/projects");
        if (Array.isArray(res)) {
          return { projects: res, tasks: [] };
        }
        return {
          projects: res?.projects || [],
          tasks: res?.tasks || [],
        };
      } catch {
        return { projects: [], tasks: [] };
      }
    },
  });

  const projects: ProjectItem[] = useMemo(() => {
    return (data?.projects || []).map((p: any) => ({
      id: p.id,
      name: p.name || "Untitled Project",
      description: p.description || "",
      status: p.status || "in_progress",
      priority: p.priority || "medium",
      progress: Number(p.progress) || 0,
      clientName: p.clientName || "Direct Organization",
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }, [data?.projects]);

  const tasks: TaskItem[] = data?.tasks || [];

  // Filtered projects
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.clientName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "all" ? true : p.status === statusFilter;
      const matchPriority = priorityFilter === "all" ? true : p.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  // Aggregate Metrics
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed" || p.progress >= 100).length;
  const inProgressProjects = projects.filter((p) => p.status === "in_progress" || (p.progress > 0 && p.progress < 100)).length;
  const criticalProjects = projects.filter((p) => (p.priority || "").toLowerCase() === "critical").length;

  const completedPct = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const inProgressPct = totalProjects > 0 ? Math.round((inProgressProjects / totalProjects) * 100) : 0;

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No projects to export");
    const headers = [
      "Project ID",
      "Project Name",
      "Client / Owner",
      "Priority",
      "Progress (%)",
      "Status",
      "Created Date",
    ];

    const rows = filtered.map((p) => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.priority,
      p.progress,
      p.status,
      new Date(p.createdAt).toISOString().slice(0, 10),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `project-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Project report exported successfully!");
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <Badge className="bg-rose-600 text-white dark:bg-rose-700">Critical</Badge>;
      case "high":
      case "urgent":
        return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Medium</Badge>;
      case "low":
      default:
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">In Progress</Badge>;
      case "on_hold":
        return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">On Hold</Badge>;
      case "planning":
      default:
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">Planning</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── PageHeader ──────────────────────────────────────────────────── */}
      <PageHeader
        title="Project Report"
        description="Multi-project portfolio execution, milestone tracking, and task completion metrics."
        breadcrumbs={[
          { label: "Home", href: "/hrm-dashboard" },
          { label: "Reports" },
          { label: "Project Report" },
        ]}
        actions={
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        }
      />

      {/* ── KPI Visual Progress Cards ───────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Projects"
          value={`${totalProjects}`}
          icon={<Briefcase className="size-5" />}
          description="Active enterprise initiatives"
          variant="primary"
        />
        <StatCard
          label="Completed Projects"
          value={`${completedProjects}`}
          icon={<CheckCircle2 className="size-5" />}
          description={`${completedPct}% deliverable completion`}
          variant="success"
        />
        <StatCard
          label="In Progress"
          value={`${inProgressProjects}`}
          icon={<Clock className="size-5" />}
          description={`${inProgressPct}% actively executing`}
          variant="warning"
        />
        <StatCard
          label="Critical Priority"
          value={`${criticalProjects}`}
          icon={<AlertCircle className="size-5" />}
          description="Urgent delivery escalations"
          variant="rose"
        />
      </StatsOverviewGrid>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search project name, client...",
        }}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* ── Main Project Table Card ─────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-28 text-xs font-bold uppercase tracking-wider">Project ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Project Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Client / Account</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider w-48">Execution Progress</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date Created</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading projects...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8">
                      <EmptyState
                        title="No projects found"
                        description="No projects match the current search and filter criteria."
                        icon={Briefcase}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((proj) => {
                    const projectTasks = tasks.filter((t) => t.projectId === proj.id);
                    return (
                      <TableRow key={proj.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {proj.id.startsWith("proj-") ? proj.id.toUpperCase() : `PROJ-${proj.id.slice(0, 5).toUpperCase()}`}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">{proj.name}</div>
                          {proj.description && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {proj.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {proj.clientName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={proj.progress} className="h-2 flex-1" />
                            <span className="text-xs font-mono font-medium text-muted-foreground w-9 text-right">
                              {proj.progress}%
                            </span>
                          </div>
                          {projectTasks.length > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {projectTasks.filter((t) => t.status === "completed").length} / {projectTasks.length} tasks done
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(proj.priority)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(proj.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(proj.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
