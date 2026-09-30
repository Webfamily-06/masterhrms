import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/project-report")({
  component: ProjectReportPage,
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
  const planningProjects = projects.filter((p) => p.status === "planning" || p.progress === 0).length;

  const completedPct = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const inProgressPct = totalProjects > 0 ? Math.round((inProgressProjects / totalProjects) * 100) : 0;
  const planningPct = totalProjects > 0 ? Math.round((planningProjects / totalProjects) * 100) : 0;

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
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Project Report
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Reports</span>
            <span>/</span>
            <span className="text-foreground font-medium">Project Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-blue-600" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Projects
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {totalProjects}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={100} className="h-1.5 bg-blue-100 [&>div]:bg-blue-600" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Active enterprise initiatives
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Completed Projects
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {completedProjects}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={completedPct} className="h-1.5 bg-emerald-100 [&>div]:bg-emerald-600" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <span className="text-emerald-600 font-medium">{completedPct}%</span> deliverable completion
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  In Progress
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {inProgressProjects}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={inProgressPct} className="h-1.5 bg-amber-100 [&>div]:bg-amber-600" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <span className="text-amber-600 font-medium">{inProgressPct}%</span> actively executing
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-purple-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Planning / Pipeline
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {planningProjects}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={planningPct} className="h-1.5 bg-purple-100 [&>div]:bg-purple-600" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <span className="text-purple-600 font-medium">{planningPct}%</span> backlog readiness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Project Table Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Project Registry</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filtered.length} records
              </Badge>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search project name, client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
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
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-28 text-xs font-semibold">Project ID</TableHead>
                  <TableHead className="text-xs font-semibold">Project Name</TableHead>
                  <TableHead className="text-xs font-semibold">Client / Account</TableHead>
                  <TableHead className="text-xs font-semibold w-48">Execution Progress</TableHead>
                  <TableHead className="text-xs font-semibold">Priority</TableHead>
                  <TableHead className="text-xs font-semibold">Date Created</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      Loading projects...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No projects found matching filter criteria.
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
                          <div className="font-medium text-xs text-foreground">{proj.name}</div>
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
