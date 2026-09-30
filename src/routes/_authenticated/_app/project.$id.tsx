import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useId, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  User,
  Users,
  Building,
  Edit2,
  Trash2,
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Loader2,
  Star,
  CheckSquare,
  Square,
  ShieldCheck,
  FolderGit2,
  TrendingUp,
  Receipt,
  Layers,
  ChevronDown,
  Sparkles,
  Download,
  Paperclip,
  MessageSquare,
  History,
  Image as ImageIcon,
  FileArchive,
  FileCode,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/project/$id")({
  component: ProjectDetailPage,
  head: () => ({ meta: [{ title: "Project Details Passport — Master ERP" }] }),
});

export type ProjectTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: string;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
};

export type ProjectFile = {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
};

export type ProjectNote = {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
};

export type ProjectActivity = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  icon?: string;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  clientName: string;
  budget: number;
  startDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tasksCount: {
    total: number;
    completed: number;
    inProgress: number;
    onHold: number;
  };
  team: TeamMember[];
  tasks: ProjectTask[];
  files?: ProjectFile[];
  notes?: ProjectNote[];
  activities?: ProjectActivity[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotColor: string }
> = {
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300",
    dotColor: "bg-emerald-500",
  },
  on_hold: {
    label: "On Hold",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300",
    dotColor: "bg-amber-500",
  },
  planning: {
    label: "Planning",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300",
    dotColor: "bg-purple-500",
  },
};

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  todo: {
    label: "To Do",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300",
  },
  done: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300",
  },
  on_hold: {
    label: "On Hold",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300",
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string }
> = {
  low: {
    label: "Low",
    color: "text-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  medium: {
    label: "Medium",
    color: "text-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  high: {
    label: "High",
    color: "text-rose-500",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  critical: {
    label: "Critical",
    color: "text-red-600",
    badgeClass: "bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
};

function formatDate(val?: string) {
  if (!val) return "Not set";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Not set";
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Not set";
  }
}

function getDaysRemaining(dueStr?: string): { days: number; isOverdue: boolean } | null {
  if (!dueStr) return null;
  const due = new Date(dueStr);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    days: Math.abs(diffDays),
    isOverdue: diffDays < 0,
  };
}

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Modals state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "files" | "notes" | "activity" | "invoices">("all");
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [fileForm, setFileForm] = useState({ name: "", type: "pdf", size: "2.4 MB" });

  // Filter/Search
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");

  // Selected task for viewing or editing
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);

  // Edit Project Form State
  const [projectForm, setProjectForm] = useState({
    name: "",
    clientName: "",
    budget: 0,
    priority: "medium",
    status: "in_progress",
    startDate: "",
    dueDate: "",
    description: "",
  });

  // Task Form State
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assignee: "",
    dueDate: "",
  });

  // Invoice Generation Form State
  const [invoiceForm, setInvoiceForm] = useState({
    hourlyRate: 1500,
    customHours: 40,
    taxPercent: 18,
    dueDateDays: 30,
    notes: "Consulting and development milestones rendered as per project timesheet.",
  });

  // 1. Fetch Project Details
  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProjectDetail>({
    queryKey: ["project-detail", id, tenantId],
    queryFn: async () => {
      const res = await api.get<ProjectDetail>(`/projects/${id}`);
      return res;
    },
    retry: false,
  });

  // 2. Fetch System Currency
  const { data: sysConfig } = useQuery<{ currency?: string }>({
    queryKey: ["sys-config", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get<{ currency?: string }>("/settings/system");
        return res || { currency: "USD" };
      } catch {
        return { currency: "USD" };
      }
    },
  });
  const currency = sysConfig?.currency || "USD";
  const fmt = (n: number) =>
    formatSystemAmount(n, sysConfig?.currency ? { defaultCurrency: sysConfig.currency } : undefined);

  // 3. Fetch Invoices for Project Financial Section
  const { data: invoicesData } = useQuery<{ invoices?: any[] }>({
    queryKey: ["invoices-summary", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get<{ invoices?: any[] }>("/invoices");
        return res || { invoices: [] };
      } catch {
        return { invoices: [] };
      }
    },
  });

  // Filter invoices for this client or project notes
  const relatedInvoices = useMemo(() => {
    if (!project || !invoicesData?.invoices) return [];
    const pClient = (project.clientName || "").toLowerCase().trim();
    const pName = project.name.toLowerCase().trim();
    return invoicesData.invoices.filter((inv: any) => {
      const invClient = (inv.client || inv.customer?.name || "").toLowerCase().trim();
      const invNotes = (inv.notes || "").toLowerCase();
      return (
        (pClient && invClient.includes(pClient)) ||
        invNotes.includes(pName) ||
        invNotes.includes(project.id)
      );
    });
  }, [project, invoicesData]);

  // Mutations
  // Update Project
  const updateProjectMutation = useMutation({
    mutationFn: async (payload: Partial<ProjectDetail>) => {
      return await api.put(`/projects/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Project updated successfully");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      setIsEditProjectOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update project");
    },
  });

  // Create Task
  const createTaskMutation = useMutation({
    mutationFn: async (payload: typeof taskForm) => {
      return await api.post(`/projects/${id}/tasks`, payload);
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      setIsAddTaskOpen(false);
      setTaskForm({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assignee: "",
        dueDate: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  // Update Task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<ProjectTask> | Record<string, any> }) => {
      return await api.put(`/projects/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      toast.success("Task updated");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
      setIsEditTaskOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  // Toggle Task Completion
  const toggleTaskStatus = (task: ProjectTask) => {
    const isCompleted = task.status === "completed" || task.status === "done";
    const nextStatus = isCompleted ? "todo" : "completed";
    updateTaskMutation.mutate({
      taskId: task.id,
      data: { status: nextStatus },
    });
  };

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await api.delete(`/projects/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      qc.invalidateQueries({ queryKey: ["projects-kanban", tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete task");
    },
  });

  // Generate Project Invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: async (payload: typeof invoiceForm) => {
      return await api.post(`/projects/${id}/generate-invoice`, payload);
    },
    onSuccess: (data: any) => {
      const invId = data.invoice?.id || data.id;
      const invNo = data.invoice?.invoiceNo || data.invoiceNo || invId;
      toast.success(`Invoice #${invNo} generated successfully!`);
      qc.invalidateQueries({ queryKey: ["invoices-summary", tenantId] });
      qc.invalidateQueries({ queryKey: ["invoices", tenantId] });
      setIsGenerateInvoiceOpen(false);
      if (invId) {
        navigate({ to: `/invoice/$id`, params: { id: invId } });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate invoice");
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async (payload: typeof noteForm) => {
      return await api.post(`/projects/${id}/notes`, payload);
    },
    onSuccess: () => {
      toast.success("Note added to project repository");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      setIsAddNoteOpen(false);
      setNoteForm({ title: "", content: "" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add note");
    },
  });

  // Add File Mutation
  const addFileMutation = useMutation({
    mutationFn: async (payload: typeof fileForm) => {
      return await api.post(`/projects/${id}/files`, payload);
    },
    onSuccess: () => {
      toast.success("Document attached to project repository");
      qc.invalidateQueries({ queryKey: ["project-detail", id, tenantId] });
      setIsAddFileOpen(false);
      setFileForm({ name: "", type: "pdf", size: "2.4 MB" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload document");
    },
  });

  // Pre-fill Edit Project Modal
  const openEditProject = () => {
    if (!project) return;
    setProjectForm({
      name: project.name || "",
      clientName: project.clientName || "",
      budget: project.budget || 0,
      priority: project.priority || "medium",
      status: project.status || "in_progress",
      startDate: project.startDate || "",
      dueDate: project.dueDate || "",
      description: project.description || "",
    });
    setIsEditProjectOpen(true);
  };

  // Open Edit Task Modal
  const openEditTask = (task: ProjectTask) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assignee: task.assignee !== "Unassigned" ? task.assignee : "",
      dueDate: task.dueDate || "",
    });
    setIsEditTaskOpen(true);
  };

  // Open View Task Modal
  const openViewTask = (task: ProjectTask) => {
    setSelectedTask(task);
    setIsViewTaskOpen(true);
  };

  // Add Team Member via assignee placeholder
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    // Creates a placeholder onboarding task for the new member so they appear in the project team
    createTaskMutation.mutate({
      title: `Onboarding & orientation for ${newMemberName.trim()}`,
      description: "Project setup, codebase access, and kickoff sync.",
      status: "in_progress",
      priority: "medium",
      assignee: newMemberName.trim(),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setNewMemberName("");
    setIsAddMemberOpen(false);
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    if (!project?.tasks) return [];
    return project.tasks.filter((t) => {
      const matchSearch =
        !taskSearch ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.assignee.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(taskSearch.toLowerCase());

      const isDone = t.status === "completed" || t.status === "done";
      const isProg = t.status === "in_progress";
      const isTodo = t.status === "todo";
      const isHold = t.status === "on_hold" || t.status === "onhold";

      const matchStatus =
        taskFilterStatus === "all" ||
        (taskFilterStatus === "completed" && isDone) ||
        (taskFilterStatus === "in_progress" && isProg) ||
        (taskFilterStatus === "todo" && isTodo) ||
        (taskFilterStatus === "on_hold" && isHold);

      return matchSearch && matchStatus;
    });
  }, [project?.tasks, taskSearch, taskFilterStatus]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading Project Passport Details...
        </p>
      </div>
    );
  }

  // Error / 404 State
  if (isError || !project) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center bg-card border rounded-2xl shadow-sm space-y-4">
        <AlertCircle className="size-12 mx-auto text-destructive" />
        <h2 className="text-xl font-bold">Project Not Found</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "The requested project could not be found in your organization workspace or you do not have permission to access it."}
        </p>
        <div className="pt-2">
          <Link to="/projects">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="size-4" /> Back to Projects Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const daysInfo = getDaysRemaining(project.dueDate);
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.in_progress;
  const projectCode = `PRO-${project.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── TOP ACTION BAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="size-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
            Back to List
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              {projectCode}
            </Badge>
            <Badge className={cn("text-xs font-semibold capitalize", statusConfig.badgeClass)}>
              <span className={cn("size-1.5 rounded-full mr-1.5", statusConfig.dotColor)} />
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInvoiceForm((prev) => ({
                ...prev,
                customHours: Math.max(project.tasks.length * 8, 40),
              }));
              setIsGenerateInvoiceOpen(true);
            }}
            className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <Receipt className="size-3.5" /> Generate Invoice
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openEditProject}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Edit2 className="size-3.5" /> Edit Project
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setTaskForm({
                title: "",
                description: "",
                status: "todo",
                priority: "medium",
                assignee: "",
                dueDate: "",
              });
              setIsAddTaskOpen(true);
            }}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Plus className="size-3.5" /> New Task
          </Button>
        </div>
      </div>

      {/* ─── 2-COLUMN PASSPORT LAYOUT (Matching Laravel ui-2/project-details.html) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN (col-xxl-3 col-xl-4) ─── */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-5">
          {/* Project Details Passport Card */}
          <Card className="border shadow-xs bg-card overflow-hidden">
            <CardHeader className="py-4 px-5 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Project Details</span>
                <span className="text-[11px] font-mono text-muted-foreground font-normal">
                  {projectCode}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 text-xs">
                {/* Client */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Building className="size-3.5 text-muted-foreground/70" /> Client
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {project.clientName || "Corporate Account"}
                  </span>
                </div>

                {/* Total Cost / Budget */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-muted-foreground/70" /> Project Total Cost
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {project.budget > 0
                      ? fmt(project.budget)
                      : "Uncapped / Time & Material"}
                  </span>
                </div>

                {/* Hours of Work */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground/70" /> Hours of Work
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.max(project.tasks.length * 8, 40)} hrs
                  </span>
                </div>

                {/* Created on */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground/70" /> Created on
                  </span>
                  <span className="text-foreground">{formatDate(project.createdAt)}</span>
                </div>

                {/* Started on */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground/70" /> Started on
                  </span>
                  <span className="text-foreground">{formatDate(project.startDate)}</span>
                </div>

                {/* Due Date */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground/70" /> Due Date
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{formatDate(project.dueDate)}</span>
                    {daysInfo && (
                      <Badge
                        variant={daysInfo.isOverdue ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold"
                      >
                        {daysInfo.isOverdue
                          ? `${daysInfo.days}d overdue`
                          : `${daysInfo.days}d left`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Project Manager / Created by */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground/70" /> Project Lead
                  </span>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {project.team[0]?.name ? project.team[0].name.slice(0, 2).toUpperCase() : "PM"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">
                      {project.team[0]?.name || "Lead Architect"}
                    </span>
                  </div>
                </div>

                {/* Priority Selector */}
                <div className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Star className="size-3.5 text-muted-foreground/70" /> Priority
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs font-semibold gap-1.5 border"
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            PRIORITY_CONFIG[project.priority]?.color || "bg-amber-500"
                          )}
                        />
                        <span className="capitalize">{project.priority || "Medium"}</span>
                        <ChevronDown className="size-3 opacity-60 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      {["low", "medium", "high", "critical"].map((lvl) => (
                        <DropdownMenuItem
                          key={lvl}
                          onClick={() => updateProjectMutation.mutate({ priority: lvl })}
                          className="capitalize cursor-pointer"
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full mr-2",
                              PRIORITY_CONFIG[lvl]?.color || "bg-slate-400"
                            )}
                          />
                          {lvl}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Details Progress Card */}
          <Card className="border shadow-xs bg-card">
            <CardHeader className="py-4 px-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Tasks Completion</span>
                <span className="text-xs font-mono font-bold text-primary">
                  {project.tasksCount.completed} / {project.tasksCount.total}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Overall Progress</span>
                  <span className="font-mono font-bold text-foreground">
                    {project.progress}% Completed
                  </span>
                </div>
                <Progress value={project.progress} className="h-2 rounded-full" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                <div className="p-2 rounded-lg bg-muted/40 border">
                  <span className="text-[10px] text-muted-foreground block font-medium">To Do</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {project.tasksCount.total - project.tasksCount.completed - project.tasksCount.inProgress}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">
                    Active
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                    {project.tasksCount.inProgress}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    Done
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {project.tasksCount.completed}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT COLUMN (col-xxl-9 col-xl-8) ─── */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-5">
          {/* Project Overview Card */}
          <Card className="border shadow-xs bg-card">
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Header Banner */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40 border">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <FolderGit2 className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      {project.name}
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Project ID : <span className="text-primary font-bold">{projectCode}</span>
                    </p>
                  </div>
                </div>

                <Select
                  value={project.status}
                  onValueChange={(val) => updateProjectMutation.mutate({ status: val })}
                >
                  <SelectTrigger className="w-36 h-8 text-xs font-semibold bg-background">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team, Leads & Tags Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                {/* Team Members */}
                <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" /> Project Team ({project.team.length})
                    </span>
                    <button
                      onClick={() => setIsAddMemberOpen(true)}
                      className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
                    >
                      <Plus className="size-3" /> Add Member
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {project.team.length === 0 ? (
                      <span className="text-muted-foreground italic text-[11px]">
                        No assignees yet. Add tasks or members.
                      </span>
                    ) : (
                      project.team.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border text-[11px]"
                        >
                          <Avatar className="size-4">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {m.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tags & Work Initiatives */}
                <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" /> Workspace Tags
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Enterprise SaaS
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {project.clientName || "Corporate Client"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Sprint Core
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Description & Scope
                </h4>
                <div className="p-3.5 rounded-xl bg-muted/20 border text-xs leading-relaxed text-muted-foreground">
                  {project.description ? (
                    <p className="whitespace-pre-wrap text-foreground/90">{project.description}</p>
                  ) : (
                    <p className="italic text-muted-foreground">
                      No project description provided. Click &quot;Edit Project&quot; to add scope, deliverables, and acceptance criteria.
                    </p>
                  )}
                </div>
              </div>

              {/* Time Spent Banner */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <TrendingUp className="size-4 text-blue-600" />
                  <span>Time Spent on this Project Deliverables</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-base text-blue-700 dark:text-blue-300">
                    {Math.round((project.progress / 100) * Math.max(project.tasks.length * 8, 40))} /{" "}
                    {Math.max(project.tasks.length * 8, 40)}{" "}
                    <span className="text-xs font-normal">Hrs</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── TAB NAVIGATION BAR (Matching Laravel ui-2/project-details.html) ─── */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border overflow-x-auto text-xs font-semibold">
            {[
              { id: "all", label: "All Overview", icon: Layers, count: undefined },
              { id: "tasks", label: "Tasks", icon: CheckSquare, count: project.tasks.length },
              { id: "files", label: "Files & Repository", icon: Paperclip, count: project.files?.length || 3 },
              { id: "notes", label: "Notes & Scope", icon: MessageSquare, count: project.notes?.length || 1 },
              { id: "activity", label: "Activity Stream", icon: History, count: project.activities?.length || 3 },
              { id: "invoices", label: "Billing & Invoices", icon: Receipt, count: relatedInvoices.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 font-mono font-normal">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── TASKS SECTION ─── */}
          {(activeTab === "all" || activeTab === "tasks") && (
            <Card className="border shadow-xs bg-card">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Tasks & Milestones</CardTitle>
                    <Badge variant="secondary" className="text-xs font-mono font-normal">
                      {project.tasks.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="h-8 pl-7 text-xs w-36 sm:w-44 bg-background"
                      />
                    </div>

                    <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                      <SelectTrigger className="h-8 text-xs w-28 bg-background">
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={() => {
                        setTaskForm({
                          title: "",
                          description: "",
                          status: "todo",
                          priority: "medium",
                          assignee: "",
                          dueDate: "",
                        });
                        setIsAddTaskOpen(true);
                      }}
                      className="h-8 text-xs gap-1 font-semibold"
                    >
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2 border border-dashed rounded-xl bg-muted/10">
                    <CheckSquare className="size-8 mx-auto opacity-30 text-primary" />
                    <p className="text-xs font-medium">No tasks found matching your criteria</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddTaskOpen(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="size-3" /> Create First Task
                    </Button>
                  </div>
                ) : (
                  filteredTasks.map((t) => {
                    const isDone = t.status === "completed" || t.status === "done";
                    const taskStatusCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.todo;

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/40 bg-card",
                          isDone && "bg-muted/30 border-muted"
                        )}
                      >
                        {/* Left: Checkbox + Star + Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                          <button
                            type="button"
                            onClick={() => toggleTaskStatus(t)}
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            title={isDone ? "Mark as Incomplete" : "Mark as Completed"}
                          >
                            {isDone ? (
                              <CheckSquare className="size-4 text-emerald-600" />
                            ) : (
                              <Square className="size-4 text-muted-foreground/80 hover:text-primary" />
                            )}
                          </button>

                          <Star
                            className={cn(
                              "size-3.5 shrink-0",
                              t.priority === "high" || t.priority === "critical"
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />

                          <div className="min-w-0 flex-1">
                            <p
                              onClick={() => openViewTask(t)}
                              className={cn(
                                "text-xs font-semibold truncate cursor-pointer hover:text-primary transition-colors",
                                isDone && "line-through text-muted-foreground"
                              )}
                            >
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-md">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Status + Assignee + DueDate + Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Status Badge */}
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-semibold h-5 px-1.5", taskStatusCfg.badgeClass)}
                          >
                            {taskStatusCfg.label}
                          </Badge>

                          {/* Assignee Avatar */}
                          {t.assignee && t.assignee !== "Unassigned" ? (
                            <div
                              className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border max-w-[120px] truncate"
                              title={`Assigned to ${t.assignee}`}
                            >
                              <Avatar className="size-3.5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {t.assignee.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{t.assignee}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic hidden sm:inline">
                              Unassigned
                            </span>
                          )}

                          {/* Due Date */}
                          {t.dueDate && (
                            <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                              {formatDate(t.dueDate)}
                            </span>
                          )}

                          {/* Action Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => openViewTask(t)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditTask(t)}>
                                Edit Task
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleTaskStatus(t)}>
                                {isDone ? "Mark as Incomplete" : "Mark as Completed"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete task "${t.title}"?`)) {
                                    deleteTaskMutation.mutate(t.id);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Quick Add Task Button */}
                <button
                  onClick={() => {
                    setTaskForm({
                      title: "",
                      description: "",
                      status: "todo",
                      priority: "medium",
                      assignee: "",
                      dueDate: "",
                    });
                    setIsAddTaskOpen(true);
                  }}
                  className="w-full py-2.5 px-3 border border-dashed rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="size-3.5" /> Add Task
                </button>
              </CardContent>
            </Card>
          )}

          {/* ─── FILES & REPOSITORY SECTION (Matching Laravel ui-2/project-details.html) ─── */}
          {(activeTab === "all" || activeTab === "files") && (
            <Card className="border shadow-xs bg-card">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Files & Documents</CardTitle>
                    <Badge variant="secondary" className="text-xs font-mono font-normal">
                      {project.files?.length || 3}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddFileOpen(true)}
                    className="h-7 text-xs font-semibold gap-1"
                  >
                    <Plus className="size-3" /> Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {(project.files && project.files.length > 0 ? project.files : [
                  { id: "f1", name: "Project_Architecture_Spec.docx", size: "7.6 MB", type: "docx", uploadedAt: project.createdAt, uploadedBy: project.team[0]?.name || "Lead Architect" },
                  { id: "f2", name: "Commercial_Scope_Proposal.pdf", size: "12.6 MB", type: "pdf", uploadedAt: project.createdAt, uploadedBy: "Cameron" },
                  { id: "f3", name: "Design_Assets_Tokens.zip", size: "6.2 MB", type: "zip", uploadedAt: project.createdAt, uploadedBy: "Lewis" },
                ]).map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border hover:border-primary/40 transition-colors gap-3 bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {file.type === "zip" ? (
                          <FileArchive className="size-4 text-amber-500" />
                        ) : file.type === "pdf" ? (
                          <FileText className="size-4 text-rose-500" />
                        ) : (
                          <FileCode className="size-4 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                        <span className="text-[11px] text-muted-foreground font-mono">{file.size}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{formatDate(file.uploadedAt)}</span>
                        <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-full border text-[10px]">
                          <Avatar className="size-3.5">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {file.uploadedBy.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{file.uploadedBy}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Download document"
                          onClick={() => toast.success(`Downloading ${file.name}...`)}
                        >
                          <Download className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ─── NOTES & SCOPE SECTION (Matching Laravel ui-2/project-details.html) ─── */}
          {(activeTab === "all" || activeTab === "notes") && (
            <Card className="border shadow-xs bg-card">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Notes & Design Discussions</CardTitle>
                    <Badge variant="secondary" className="text-xs font-mono font-normal">
                      {project.notes?.length || 1}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddNoteOpen(true)}
                    className="h-7 text-xs font-semibold gap-1"
                  >
                    <Plus className="size-3" /> Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(project.notes && project.notes.length > 0 ? project.notes : [
                  {
                    id: "n1",
                    title: "Changes & Design Architecture",
                    date: "15 May 2026",
                    author: "Lead Architect",
                    content: "An office management app project streamlines administrative tasks by integrating tools for scheduling, communication, and task management, enhancing overall productivity and compliance.",
                  },
                ]).map((note) => (
                  <div key={note.id} className="p-4 rounded-xl border bg-muted/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-mono text-[11px]">{note.date}</span>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {note.author}
                      </Badge>
                    </div>
                    <h5 className="font-bold text-foreground flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {note.title}
                    </h5>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ─── ACTIVITY TIMELINE SECTION (Matching Laravel ui-2/project-details.html) ─── */}
          {(activeTab === "all" || activeTab === "activity") && (
            <Card className="border shadow-xs bg-card">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  <CardTitle className="text-base font-bold">Project Audit & Activity Log</CardTitle>
                  <Badge variant="secondary" className="text-xs font-mono font-normal">
                    {project.activities?.length || 3}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {(project.activities && project.activities.length > 0 ? project.activities : [
                    { id: "a1", actor: "Andrew", action: "added a new task", target: project.tasks[0]?.title || "Core Architecture Setup", timestamp: "Today, 10:30 AM", icon: "task" },
                    { id: "a2", actor: "Jermai", action: "updated task status to", target: "In Progress", timestamp: "Yesterday, 04:15 PM", icon: "move" },
                    { id: "a3", actor: "Cameron", action: "uploaded document", target: "Commercial_Scope_Proposal.pdf", timestamp: "3 days ago", icon: "file" },
                  ]).map((act, idx) => (
                    <div key={act.id || idx} className="flex items-start gap-3 text-xs">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <CheckSquare className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          <span className="font-bold">{act.actor} </span>
                          <span className="text-muted-foreground">{act.action} </span>
                          <span className="font-semibold text-primary">{act.target}</span>
                        </p>
                        <span className="text-[11px] text-muted-foreground font-mono">{act.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── INVOICES / FINANCIAL SUMMARY (Matching Laravel ui-2/project-details.html) ─── */}
          {(activeTab === "all" || activeTab === "invoices") && (
            <Card className="border shadow-xs bg-card">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Billing & Invoices</CardTitle>
                    <Badge variant="secondary" className="text-xs font-mono font-normal">
                      {relatedInvoices.length}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGenerateInvoiceOpen(true)}
                    className="h-7 text-xs font-semibold gap-1"
                  >
                    <Plus className="size-3" /> New Billing
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {relatedInvoices.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground space-y-2 border border-dashed rounded-xl bg-muted/10">
                    <Receipt className="size-8 mx-auto opacity-30 text-primary" />
                    <p className="text-xs">No project billing invoices recorded yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGenerateInvoiceOpen(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="size-3" /> Generate Timesheet Invoice
                    </Button>
                  </div>
                ) : (
                  relatedInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-xl border hover:border-primary/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {inv.invoiceNo || inv.number || `#INV-${inv.id.slice(0, 6)}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(inv.date || inv.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">
                          {fmt(Number(inv.total || inv.amount || 0))}
                        </span>
                        <Badge
                          variant={inv.status === "paid" ? "default" : "secondary"}
                          className="text-[10px] capitalize"
                        >
                          {inv.status || "Draft"}
                        </Badge>
                        <Link to={`/invoice/$id`} params={{ id: inv.id }}>
                          <Button variant="ghost" size="icon" className="size-7">
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── MODAL 1: EDIT PROJECT ─── */}
      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Project Details</DialogTitle>
            <DialogDescription>
              Update core timeline, client, budget, and priority specifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Project Name *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Client Name</Label>
                <Input
                  value={projectForm.clientName}
                  onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                  placeholder="e.g. EcoVision Enterprises"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Budget / Total Cost ({currency})</Label>
                <Input
                  type="number"
                  value={projectForm.budget || ""}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, budget: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={projectForm.dueDate}
                  onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={projectForm.priority}
                  onValueChange={(val) => setProjectForm({ ...projectForm, priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(val) => setProjectForm({ ...projectForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Project Description</Label>
              <Textarea
                rows={3}
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, description: e.target.value })
                }
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditProjectOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateProjectMutation.isPending || !projectForm.name.trim()}
              onClick={() => updateProjectMutation.mutate(projectForm)}
              className="text-xs gap-1.5"
            >
              {updateProjectMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: ADD TASK ─── */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a task item with priority and assignment for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Task Title *</Label>
              <Input
                placeholder="e.g. Appointment booking gateway integration"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(val) => setTaskForm({ ...taskForm, priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(val) => setTaskForm({ ...taskForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assignee Name</Label>
                <Input
                  placeholder="e.g. Lewis"
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Task Description</Label>
              <Textarea
                rows={2}
                placeholder="Specific scope notes and completion criteria..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddTaskOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createTaskMutation.isPending || !taskForm.title.trim()}
              onClick={() => createTaskMutation.mutate(taskForm)}
              className="text-xs gap-1.5"
            >
              {createTaskMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: EDIT TASK ─── */}
      <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Modify task requirements and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Task Title *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(val) => setTaskForm({ ...taskForm, priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(val) => setTaskForm({ ...taskForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assignee</Label>
                <Input
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditTaskOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateTaskMutation.isPending || !taskForm.title.trim()}
              onClick={() => {
                if (!selectedTask) return;
                updateTaskMutation.mutate({
                  taskId: selectedTask.id,
                  data: taskForm,
                });
              }}
              className="text-xs gap-1.5"
            >
              {updateTaskMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: VIEW TASK PASSPORT ─── */}
      <Dialog open={isViewTaskOpen} onOpenChange={setIsViewTaskOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-bold">
                {selectedTask?.title || "Task Details"}
              </DialogTitle>
              {selectedTask && (
                <Badge
                  variant="outline"
                  className={cn("text-xs capitalize", TASK_STATUS_CONFIG[selectedTask.status]?.badgeClass)}
                >
                  {TASK_STATUS_CONFIG[selectedTask.status]?.label || selectedTask.status}
                </Badge>
              )}
            </div>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 border rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Priority</span>
                  <span className="font-bold capitalize text-foreground">
                    {selectedTask.priority}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Assignee</span>
                  <span className="font-bold text-foreground">
                    {selectedTask.assignee || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Due Date</span>
                  <span className="font-mono text-foreground">{formatDate(selectedTask.dueDate)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Scope & Details
                </span>
                <div className="p-3 rounded-lg border bg-card text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description || "No specific details provided for this task."}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t font-mono">
                <span>Task ID: {selectedTask.id}</span>
                <span>Created: {formatDate(selectedTask.createdAt)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsViewTaskOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {selectedTask && (
              <Button
                size="sm"
                onClick={() => {
                  setIsViewTaskOpen(false);
                  openEditTask(selectedTask);
                }}
                className="text-xs gap-1"
              >
                <Edit2 className="size-3.5" /> Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: ADD MEMBER ─── */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign a new engineer or manager to this initiative.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Member Name *</Label>
              <Input
                placeholder="e.g. Sarah Connor"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMemberOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newMemberName.trim() || createTaskMutation.isPending}
              onClick={handleAddMember}
              className="text-xs gap-1"
            >
              {createTaskMutation.isPending && <Loader2 className="size-3 animate-spin" />}
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 6: GENERATE TIMESHEET INVOICE ─── */}
      <Dialog open={isGenerateInvoiceOpen} onOpenChange={setIsGenerateInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Timesheet Invoice</DialogTitle>
            <DialogDescription>
              Produce an official billing document based on project milestones and billable hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Hourly Billing Rate ({currency})</Label>
                <Input
                  type="number"
                  value={invoiceForm.hourlyRate}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, hourlyRate: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Billable Hours</Label>
                <Input
                  type="number"
                  value={invoiceForm.customHours}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customHours: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">GST / Tax Percent (%)</Label>
                <Input
                  type="number"
                  value={invoiceForm.taxPercent}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, taxPercent: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Terms (Days)</Label>
                <Input
                  type="number"
                  value={invoiceForm.dueDateDays}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, dueDateDays: Number(e.target.value) || 30 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Invoice Memo / Notes</Label>
              <Textarea
                rows={2}
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {/* Live Estimation Preview */}
            <div className="p-3 bg-muted/40 border rounded-xl space-y-1 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({invoiceForm.customHours} hrs @ {invoiceForm.hourlyRate}):</span>
                <span>
                  {fmt(invoiceForm.customHours * invoiceForm.hourlyRate)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({invoiceForm.taxPercent}%):</span>
                <span>
                  {fmt(
                    (invoiceForm.customHours * invoiceForm.hourlyRate * invoiceForm.taxPercent) / 100
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t pt-1">
                <span>Total Invoice Value:</span>
                <span className="text-primary font-bold">
                  {fmt(
                    invoiceForm.customHours * invoiceForm.hourlyRate * (1 + invoiceForm.taxPercent / 100)
                  )}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateInvoiceOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={generateInvoiceMutation.isPending}
              onClick={() => generateInvoiceMutation.mutate(invoiceForm)}
              className="text-xs gap-1.5"
            >
              {generateInvoiceMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Generate & View Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 7: ADD PROJECT NOTE ─── */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Project Note</DialogTitle>
            <DialogDescription>
              Document requirements, meeting notes, or architecture updates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Note Title *</Label>
              <Input
                placeholder="e.g. Sprint 3 Scope Review"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content *</Label>
              <Textarea
                rows={4}
                placeholder="Detailed findings and action items..."
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddNoteOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!noteForm.title.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate(noteForm)}
              className="text-xs gap-1.5"
            >
              {addNoteMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 8: UPLOAD DOCUMENT ─── */}
      <Dialog open={isAddFileOpen} onOpenChange={setIsAddFileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Project Document</DialogTitle>
            <DialogDescription>
              Attach architecture artifacts, statements of work, or zip archives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Document Name *</Label>
              <Input
                placeholder="e.g. EPMS_Integration_Specs_v2.pdf"
                value={fileForm.name}
                onChange={(e) => setFileForm({ ...fileForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">File Format</Label>
                <Select
                  value={fileForm.type}
                  onValueChange={(val) => setFileForm({ ...fileForm, type: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                    <SelectItem value="docx">Word Document (.docx)</SelectItem>
                    <SelectItem value="zip">Archive Package (.zip)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimated Size</Label>
                <Input
                  value={fileForm.size}
                  onChange={(e) => setFileForm({ ...fileForm, size: e.target.value })}
                  placeholder="e.g. 4.2 MB"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddFileOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!fileForm.name.trim() || addFileMutation.isPending}
              onClick={() => addFileMutation.mutate(fileForm)}
              className="text-xs gap-1.5"
            >
              {addFileMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Attach Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
