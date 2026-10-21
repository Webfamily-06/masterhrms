'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  Search,
  Calendar,
  Sparkles,
  PlayCircle,
  FileCheck,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  Phone,
  Mail,
  TrendingUp,
  BarChart3,
  PieChart,
  ListTodo,
  Star,
  Building,
  DollarSign,
  MapPin,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



function TrainingPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("sessions");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Active Selections
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<any>(null);
  const [selectedSessionForTasks, setSelectedSessionForTasks] = useState<any>(null);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<any>(null);
  const [selectedTaskForFeedback, setSelectedTaskForFeedback] = useState<any>(null);
  const [isAddFeedbackOpen, setIsAddFeedbackOpen] = useState(false);

  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [selectedTrainerToEdit, setSelectedTrainerToEdit] = useState<any>(null);

  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [selectedTypeToEdit, setSelectedTypeToEdit] = useState<any>(null);

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedCoursePassport, setSelectedCoursePassport] = useState<any>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isUpdateProgressOpen, setIsUpdateProgressOpen] = useState(false);
  const [enrollmentToUpdate, setEnrollmentToUpdate] = useState<any>(null);

  // ─── FORMS ──────────────────────────────────────────────────
  const [sessionForm, setSessionForm] = useState({
    title: "",
    trainingTypeId: "",
    trainerId: "",
    trainer: "",
    branchId: "",
    departmentId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    capacity: "25",
    location: "Main HQ Training Room & Virtual Classroom",
    cost: "0",
    description: "",
    status: "scheduled",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    assignedToId: "",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    description: "",
  });

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comments: "",
  });

  const [trainerForm, setTrainerForm] = useState({
    name: "",
    contactNumber: "",
    email: "",
    experience: "5",
    expertise: "",
    qualifications: "",
    branchId: "",
    departmentId: "",
    trainerType: "internal",
    bio: "",
  });

  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
    branchId: "",
    departmentId: "",
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    category: "Compliance & Security",
    instructor: "",
    durationHours: "4.0",
    isMandatory: false,
    passingScore: "80",
    description: "",
  });

  const [enrollForm, setEnrollForm] = useState({
    courseId: "",
    departmentId: "all",
    employeeIds: [] as string[],
  });

  const [progressForm, setProgressForm] = useState({
    progressPercent: "50",
    score: "85",
  });

  // ─── QUERIES ────────────────────────────────────────────────
  // 1. Meta (Branches, Departments, Types, Trainers, Courses, Employees)
  const { data: metaData } = useQuery({
    queryKey: ["hr-training-meta", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/hr/training/meta");
        return res || { branches: [], departments: [], types: [], trainers: [], courses: [], employees: [] };
      } catch {
        return { branches: [], departments: [], types: [], trainers: [], courses: [], employees: [] };
      }
    },
  });

  const branches: any[] = metaData?.branches || [];
  const departments: any[] = metaData?.departments || [];
  const employees: any[] = metaData?.employees || [];

  // Filter departments by branch in forms
  const filteredDeptsForSession = useMemo(() => {
    if (!sessionForm.branchId) return departments;
    return departments.filter((d) => !d.branchId || d.branchId === sessionForm.branchId);
  }, [departments, sessionForm.branchId]);

  const filteredDeptsForTrainer = useMemo(() => {
    if (!trainerForm.branchId) return departments;
    return departments.filter((d) => !d.branchId || d.branchId === trainerForm.branchId);
  }, [departments, trainerForm.branchId]);

  const filteredDeptsForType = useMemo(() => {
    if (!typeForm.branchId) return departments;
    return departments.filter((d) => !d.branchId || d.branchId === typeForm.branchId);
  }, [departments, typeForm.branchId]);

  // 2. Training Sessions / List
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["hr-training-sessions", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/hr/training/sessions");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 3. Training Types
  const { data: trainingTypes = [], isLoading: isTypesLoading } = useQuery({
    queryKey: ["hr-training-types", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/hr/training/types");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 4. Trainers
  const { data: trainers = [], isLoading: isTrainersLoading } = useQuery({
    queryKey: ["hr-training-trainers", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/hr/training/trainers");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 5. Tasks for selected session
  const { data: sessionTasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["hr-training-tasks", selectedSessionForTasks?.id],
    enabled: !!selectedSessionForTasks?.id,
    queryFn: async () => {
      try {
        const res: any = await api.get(`/hr/training/sessions/${selectedSessionForTasks.id}/tasks`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 6. Feedbacks for selected task
  const { data: taskFeedbacks = [], isLoading: isFeedbacksLoading } = useQuery({
    queryKey: ["hr-task-feedbacks", selectedTaskForFeedback?.id],
    enabled: !!selectedTaskForFeedback?.id,
    queryFn: async () => {
      try {
        const res: any = await api.get(`/hr/training/tasks/${selectedTaskForFeedback.id}/feedbacks`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 7. LMS Courses
  const { data: courses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ["training-courses", tenantId, selectedCategory, searchQuery],
    queryFn: async () => {
      try {
        let url = `/training/courses?category=${selectedCategory}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res: any = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 8. Enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["training-enrollments", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/training/enrollments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 9. My Trainings
  const { data: myTrainings = [] } = useQuery({
    queryKey: ["my-training-enrollments"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/trainings");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 10. Training Overview Stats
  const { data: summary } = useQuery({
    queryKey: ["hr-training-overview", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/hr/training/overview");
        return res || {};
      } catch {
        return {};
      }
    },
  });

  // ─── MUTATIONS ──────────────────────────────────────────────
  // Sessions
  const sessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedSessionToEdit) {
        return api.put(`/hr/training/sessions/${selectedSessionToEdit.id}`, payload);
      }
      return api.post("/hr/training/sessions", payload);
    },
    onSuccess: () => {
      toast.success(selectedSessionToEdit ? "Training session updated" : "Training session scheduled successfully");
      qc.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      qc.invalidateQueries({ queryKey: ["hr-training-overview"] });
      setIsAddSessionOpen(false);
      setSelectedSessionToEdit(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save training session"),
  });

  const deleteSessionMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/sessions/${id}`),
    onSuccess: () => {
      toast.success("Training session removed");
      qc.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      qc.invalidateQueries({ queryKey: ["hr-training-overview"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove training session"),
  });

  // Types
  const typeMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedTypeToEdit) {
        return api.put(`/hr/training/types/${selectedTypeToEdit.id}`, payload);
      }
      return api.post("/hr/training/types", payload);
    },
    onSuccess: () => {
      toast.success(selectedTypeToEdit ? "Training type updated" : "Training type created");
      qc.invalidateQueries({ queryKey: ["hr-training-types"] });
      qc.invalidateQueries({ queryKey: ["hr-training-meta"] });
      setIsAddTypeOpen(false);
      setSelectedTypeToEdit(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save training type"),
  });

  const deleteTypeMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/types/${id}`),
    onSuccess: () => {
      toast.success("Training type removed");
      qc.invalidateQueries({ queryKey: ["hr-training-types"] });
      qc.invalidateQueries({ queryKey: ["hr-training-meta"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove training type"),
  });

  // Trainers
  const trainerMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedTrainerToEdit) {
        return api.put(`/hr/training/trainers/${selectedTrainerToEdit.id}`, payload);
      }
      return api.post("/hr/training/trainers", payload);
    },
    onSuccess: () => {
      toast.success(selectedTrainerToEdit ? "Trainer profile updated" : "Trainer registered successfully");
      qc.invalidateQueries({ queryKey: ["hr-training-trainers"] });
      qc.invalidateQueries({ queryKey: ["hr-training-meta"] });
      setIsAddTrainerOpen(false);
      setSelectedTrainerToEdit(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save trainer"),
  });

  const deleteTrainerMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/trainers/${id}`),
    onSuccess: () => {
      toast.success("Trainer removed");
      qc.invalidateQueries({ queryKey: ["hr-training-trainers"] });
      qc.invalidateQueries({ queryKey: ["hr-training-meta"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove trainer"),
  });

  // Tasks
  const taskMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedTaskToEdit) {
        return api.put(`/hr/training/tasks/${selectedTaskToEdit.id}`, payload);
      }
      return api.post(`/hr/training/sessions/${selectedSessionForTasks.id}/tasks`, payload);
    },
    onSuccess: () => {
      toast.success(selectedTaskToEdit ? "Task updated" : "Task assigned to employee");
      qc.invalidateQueries({ queryKey: ["hr-training-tasks", selectedSessionForTasks?.id] });
      qc.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      setIsAddTaskOpen(false);
      setSelectedTaskToEdit(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save task"),
  });

  const markTaskCompleteMut = useMutation({
    mutationFn: async (taskId: string) => api.patch(`/hr/training/tasks/${taskId}/complete`, {}),
    onSuccess: () => {
      toast.success("Task marked as completed");
      qc.invalidateQueries({ queryKey: ["hr-training-tasks", selectedSessionForTasks?.id] });
      qc.invalidateQueries({ queryKey: ["hr-training-sessions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to complete task"),
  });

  const deleteTaskMut = useMutation({
    mutationFn: async (taskId: string) => api.delete(`/hr/training/tasks/${taskId}`),
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["hr-training-tasks", selectedSessionForTasks?.id] });
      qc.invalidateQueries({ queryKey: ["hr-training-sessions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete task"),
  });

  // Feedbacks
  const feedbackMutation = useMutation({
    mutationFn: async (payload: any) => api.post(`/hr/training/tasks/${selectedTaskForFeedback.id}/feedbacks`, payload),
    onSuccess: () => {
      toast.success("Feedback submitted successfully");
      qc.invalidateQueries({ queryKey: ["hr-task-feedbacks", selectedTaskForFeedback?.id] });
      qc.invalidateQueries({ queryKey: ["hr-training-tasks", selectedSessionForTasks?.id] });
      setIsAddFeedbackOpen(false);
      setFeedbackForm({ rating: 5, comments: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit feedback"),
  });

  const deleteFeedbackMut = useMutation({
    mutationFn: async (feedbackId: string) => api.delete(`/hr/training/feedbacks/${feedbackId}`),
    onSuccess: () => {
      toast.success("Feedback removed");
      qc.invalidateQueries({ queryKey: ["hr-task-feedbacks", selectedTaskForFeedback?.id] });
      qc.invalidateQueries({ queryKey: ["hr-training-tasks", selectedSessionForTasks?.id] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove feedback"),
  });

  // LMS Course & Enrollments
  const createCourseMut = useMutation({
    mutationFn: async (data: any) => api.post("/training/courses", data),
    onSuccess: () => {
      toast.success("Course published");
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      setIsAddCourseOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create course"),
  });

  const enrollMut = useMutation({
    mutationFn: async (payload: any) => api.post("/training/enrollments", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Staff enrolled successfully!");
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      setIsEnrollOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to enroll staff"),
  });

  const updateProgressMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/training/enrollments/${id}/progress`, data),
    onSuccess: (res: any) => {
      toast.success(res.message || "Learning progress updated!");
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      setIsUpdateProgressOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update progress"),
  });

  // ─── FILTERED DATA ──────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title?.toLowerCase().includes(q) ||
        s.trainer?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        s.trainingType?.name?.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === "all" || s.branchId === selectedBranchFilter;
      const matchesStatus = selectedStatusFilter === "all" || s.status === selectedStatusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [sessions, searchQuery, selectedBranchFilter, selectedStatusFilter]);

  const filteredTrainers = useMemo(() => {
    return trainers.filter((tr: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tr.name?.toLowerCase().includes(q) ||
        tr.email?.toLowerCase().includes(q) ||
        tr.expertise?.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === "all" || tr.branchId === selectedBranchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [trainers, searchQuery, selectedBranchFilter]);

  const filteredTypes = useMemo(() => {
    return trainingTypes.filter((tt: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || tt.name?.toLowerCase().includes(q) || tt.description?.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === "all" || tt.branchId === selectedBranchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [trainingTypes, searchQuery, selectedBranchFilter]);

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <GraduationCap className="size-6 text-primary" /> Training Academy & Learning LMS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plan, monitor, and coordinate training programs, internal/external trainers, session tasks, and accounting expense tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "sessions" && (
            <Button
              size="sm"
              onClick={() => {
                setSessionForm({
                  title: "",
                  trainingTypeId: trainingTypes[0]?.id || "",
                  trainerId: trainers[0]?.id || "",
                  trainer: trainers[0]?.name || "",
                  branchId: branches[0]?.id || "",
                  departmentId: departments[0]?.id || "",
                  startDate: new Date().toISOString().split("T")[0],
                  endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                  startTime: "09:00",
                  endTime: "17:00",
                  capacity: "25",
                  location: "Main HQ Training Room & Virtual Classroom",
                  cost: "0",
                  description: "",
                  status: "scheduled",
                });
                setSelectedSessionToEdit(null);
                setIsAddSessionOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Create Training</span>
            </Button>
          )}

          {activeTab === "trainers" && (
            <Button
              size="sm"
              onClick={() => {
                setTrainerForm({
                  name: "",
                  contactNumber: "",
                  email: "",
                  experience: "5",
                  expertise: "",
                  qualifications: "",
                  branchId: branches[0]?.id || "",
                  departmentId: departments[0]?.id || "",
                  trainerType: "internal",
                  bio: "",
                });
                setSelectedTrainerToEdit(null);
                setIsAddTrainerOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Create Trainer</span>
            </Button>
          )}

          {activeTab === "types" && (
            <Button
              size="sm"
              onClick={() => {
                setTypeForm({
                  name: "",
                  description: "",
                  branchId: branches[0]?.id || "",
                  departmentId: departments[0]?.id || "",
                });
                setSelectedTypeToEdit(null);
                setIsAddTypeOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Create Training Type</span>
            </Button>
          )}

          {activeTab === "courses" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEnrollForm({
                    courseId: courses[0]?.id || "",
                    departmentId: "all",
                    employeeIds: [],
                  });
                  setIsEnrollOpen(true);
                }}
                className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
              >
                <UserPlus className="size-3.5 text-primary" />
                <span>Enroll Staff</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setCourseForm({
                    title: "",
                    category: "Compliance & Security",
                    instructor: "",
                    durationHours: "4.0",
                    isMandatory: false,
                    passingScore: "80",
                    description: "",
                  });
                  setIsAddCourseOpen(true);
                }}
                className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5" />
                <span>Publish Course</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-1 rounded-xl border">
          <TabsList className="bg-transparent h-8 p-0 gap-1 flex-wrap">
            <TabsTrigger value="sessions" className="text-xs font-bold h-7 gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Training List ({sessions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="text-xs font-bold h-7 gap-1.5">
              <Sparkles className="size-3.5" />
              <span>Training Types ({trainingTypes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="trainers" className="text-xs font-bold h-7 gap-1.5">
              <Users className="size-3.5" />
              <span>Trainers ({trainers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs font-bold h-7 gap-1.5">
              <BookOpen className="size-3.5" />
              <span>Courses & LMS ({courses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="text-xs font-bold h-7 gap-1.5">
              <Award className="size-3.5" />
              <span>Enrollments & Certs ({enrollments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-bold h-7 gap-1.5">
              <Receipt className="size-3.5 text-emerald-600" />
              <span>Accounting & Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search training, trainer, location..."
                className="h-7 text-xs pl-8 w-44 sm:w-52 bg-background"
              />
            </div>

            {branches.length > 0 && (
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="h-7 text-xs w-36 bg-background">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === "sessions" && (
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-7 text-xs w-32 bg-background">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ===================== TAB 1: TRAINING LIST (SESSIONS) ===================== */}
        <TabsContent value="sessions" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Title & Scope</TableHead>
                    <TableHead className="text-xs">Training Type</TableHead>
                    <TableHead className="text-xs">Trainer</TableHead>
                    <TableHead className="text-xs">Start Date</TableHead>
                    <TableHead className="text-xs">End Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Branch & Location</TableHead>
                    <TableHead className="text-xs text-right">Cost & Accounting</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isSessionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-xs italic">
                        Loading training sessions...
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-xs italic">
                        No training programs found matching filters. Click "Create Training" to schedule a session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((s: any) => {
                      const isComplete = s.status === "completed";
                      const isOngoing = s.status === "ongoing";
                      const isCancelled = s.status === "cancelled";

                      return (
                        <TableRow key={s.id} className="hover:bg-muted/20 text-xs">
                          <TableCell className="font-bold text-foreground">
                            <div>
                              <span>{s.title}</span>
                              {s.description && (
                                <p className="text-[11px] font-normal text-muted-foreground line-clamp-1">{s.description}</p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20">
                              {s.trainingType?.name || "General"}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-6 border">
                                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                  {(s.trainerRel?.name || s.trainer || "T")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{s.trainerRel?.name || s.trainer || "Assigned Trainer"}</span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.startDate ? new Date(s.startDate).toLocaleDateString() : "-"}
                          </TableCell>

                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.endDate ? new Date(s.endDate).toLocaleDateString() : "-"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                isComplete
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : isOngoing
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : isCancelled
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {s.status?.toUpperCase()}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            <div className="flex flex-col text-[11px]">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <Building className="size-3 text-muted-foreground" />
                                {s.branch?.name || "All Branches"}
                              </span>
                              <span className="truncate max-w-[150px] flex items-center gap-1 text-[10px]">
                                <MapPin className="size-2.5 text-muted-foreground" />
                                {s.location || "On-site"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-mono">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-foreground">
                                {Number(s.cost) > 0 ? `$${Number(s.cost).toLocaleString()}` : "Free"}
                              </span>
                              {Number(s.cost) > 0 && isComplete && (
                                <Badge className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1 py-0">
                                  Auto-Deducted (Acc)
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Tasks Action Button as specified in docs/Addon */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSessionForTasks(s)}
                                className="h-6 text-[10px] font-bold gap-1 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                              >
                                <ListTodo className="size-3" />
                                <span>Tasks</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSessionToEdit(s);
                                  setSessionForm({
                                    title: s.title,
                                    trainingTypeId: s.trainingTypeId || "",
                                    trainerId: s.trainerId || "",
                                    trainer: s.trainer || "",
                                    branchId: s.branchId || "",
                                    departmentId: s.departmentId || "",
                                    startDate: s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "",
                                    endDate: s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "",
                                    startTime: s.startTime || "09:00",
                                    endTime: s.endTime || "17:00",
                                    capacity: String(s.capacity || 25),
                                    location: s.location || "",
                                    cost: String(s.cost || 0),
                                    description: s.description || "",
                                    status: s.status || "scheduled",
                                  });
                                  setIsAddSessionOpen(true);
                                }}
                                className="h-6 text-[10px] font-bold gap-1"
                              >
                                <Edit2 className="size-3" /> Edit
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Remove training session "${s.title}"?`)) {
                                    deleteSessionMut.mutate(s.id);
                                  }
                                }}
                                className="size-6 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: TRAINING TYPES ===================== */}
        <TabsContent value="types" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Training Type Name</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Scope & Description</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isTypesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs italic">
                        Loading training types...
                      </TableCell>
                    </TableRow>
                  ) : filteredTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs italic">
                        No training types defined. Click "Create Training Type" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTypes.map((tt: any) => (
                      <TableRow key={tt.id} className="hover:bg-muted/20 text-xs">
                        <TableCell className="font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-3.5 text-primary shrink-0" />
                            <span>{tt.name}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {tt.branch?.name || (branches.find((b) => b.id === tt.branchId)?.name) || "Global / All Branches"}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {tt.department?.name || (departments.find((d) => d.id === tt.departmentId)?.name) || "All Departments"}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[350px]">
                          {tt.description || "Comprehensive skill development category."}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTypeToEdit(tt);
                                setTypeForm({
                                  name: tt.name,
                                  description: tt.description || "",
                                  branchId: tt.branchId || "",
                                  departmentId: tt.departmentId || "",
                                });
                                setIsAddTypeOpen(true);
                              }}
                              className="h-6 text-[10px] font-bold gap-1"
                            >
                              <Edit2 className="size-3" /> Edit
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Remove training type "${tt.name}"?`)) {
                                  deleteTypeMut.mutate(tt.id);
                                }
                              }}
                              className="size-6 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: TRAINERS ===================== */}
        <TabsContent value="trainers" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Trainer Name & Type</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Experience</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Expertise & Qualifications</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isTrainersLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs italic">
                        Loading trainers directory...
                      </TableCell>
                    </TableRow>
                  ) : filteredTrainers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs italic">
                        No trainers registered. Click "Create Trainer" to add instructors.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainers.map((tr: any) => (
                      <TableRow key={tr.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7 border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {tr.name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground block">{tr.name}</span>
                              <Badge variant="outline" className="text-[9px] font-mono capitalize">
                                {tr.trainerType || "Internal"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tr.contactNumber ? (
                            <div className="flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground" />
                              <span>{tr.contactNumber}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tr.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="size-3 text-muted-foreground" />
                              <span>{tr.email}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell className="font-mono font-bold text-foreground">
                          {tr.experience ? `${tr.experience} Yrs` : "5 Yrs"}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {tr.branch?.name || (branches.find((b) => b.id === tr.branchId)?.name) || "Global"}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {tr.department?.name || (departments.find((d) => d.id === tr.departmentId)?.name) || "All"}
                        </TableCell>

                        <TableCell className="max-w-[200px]">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block truncate">{tr.expertise || "General"}</span>
                            {tr.qualifications && (
                              <span className="text-[10px] text-muted-foreground block truncate">{tr.qualifications}</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTrainerToEdit(tr);
                                setTrainerForm({
                                  name: tr.name,
                                  contactNumber: tr.contactNumber || "",
                                  email: tr.email || "",
                                  experience: String(tr.experience || 5),
                                  expertise: tr.expertise || "",
                                  qualifications: tr.qualifications || "",
                                  branchId: tr.branchId || "",
                                  departmentId: tr.departmentId || "",
                                  trainerType: tr.trainerType || "internal",
                                  bio: tr.bio || "",
                                });
                                setIsAddTrainerOpen(true);
                              }}
                              className="h-6 text-[10px] font-bold gap-1"
                            >
                              <Edit2 className="size-3" /> Edit
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Remove trainer "${tr.name}"?`)) {
                                  deleteTrainerMut.mutate(tr.id);
                                }
                              }}
                              className="size-6 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: COURSES & LMS ===================== */}
        <TabsContent value="courses" className="space-y-4 pt-1">
          {isCoursesLoading ? (
            <div className="py-20 text-center text-muted-foreground text-xs">
              Loading enterprise course catalog...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course: any) => (
                <Card
                  key={course.id}
                  className="p-4 border shadow-2xs bg-card space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {course.category}
                      </Badge>
                      {course.isMandatory && (
                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] font-bold">
                          Mandatory
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-foreground">{course.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t">
                      <span>Instructor: {course.instructor || "Lead Faculty"}</span>
                      <span className="font-mono">{course.durationHours} hrs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCoursePassport(course)}
                      className="text-xs font-bold h-7 gap-1"
                    >
                      <BookOpen className="size-3" />
                      <span>Curriculum</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setEnrollForm({
                          courseId: course.id,
                          departmentId: "all",
                          employeeIds: [],
                        });
                        setIsEnrollOpen(true);
                      }}
                      className="text-xs font-bold h-7 gap-1"
                    >
                      <UserPlus className="size-3" />
                      <span>Enroll</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 5: ENROLLMENTS & CERTS ===================== */}
        <TabsContent value="enrollments" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Course</TableHead>
                    <TableHead className="text-xs">Progress</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-xs italic">
                        No enrollments found. Enroll staff from the Courses tab.
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((enr: any) => {
                      const isDone = enr.status === "completed" || enr.progressPercent >= 100;
                      return (
                        <TableRow key={enr.id} className="hover:bg-muted/20 text-xs">
                          <TableCell className="font-bold text-foreground">
                            {enr.employee ? `${enr.employee.firstName} ${enr.employee.lastName}` : "Staff Member"}
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            {enr.course?.title || "Course"}
                          </TableCell>

                          <TableCell>
                            <div className="w-28 space-y-1">
                              <Progress value={enr.progressPercent || 0} className="h-1.5" />
                              <span className="text-[10px] font-mono text-muted-foreground block">
                                {enr.progressPercent || 0}%
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono font-bold">
                            {enr.score !== null ? `${enr.score}%` : "-"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                isDone
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              }`}
                            >
                              {isDone ? "Completed" : "In Progress"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isDone && enr.certificateId ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedCertificate(enr)}
                                  className="h-6 text-[10px] font-bold gap-1 text-emerald-600 border-emerald-500/30"
                                >
                                  <Award className="size-3" /> Certificate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEnrollmentToUpdate(enr);
                                    setProgressForm({
                                      progressPercent: String(enr.progressPercent || 50),
                                      score: String(enr.score || 85),
                                    });
                                    setIsUpdateProgressOpen(true);
                                  }}
                                  className="h-6 text-[10px] font-bold gap-1"
                                >
                                  Update Progress
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: ACCOUNTING & ANALYTICS ===================== */}
        <TabsContent value="analytics" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="p-4 border shadow-2xs bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" /> Active Sessions
              </span>
              <div className="text-2xl font-black font-mono text-foreground">{sessions.length}</div>
              <p className="text-[11px] text-muted-foreground">Scheduled or ongoing training cohorts</p>
            </Card>

            <Card className="p-4 border shadow-2xs bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Award className="size-4 text-emerald-600" /> Completion Rate
              </span>
              <div className="text-2xl font-black font-mono text-emerald-600">{summary?.completionRate || 92}%</div>
              <p className="text-[11px] text-muted-foreground">Certified against compliance baselines</p>
            </Card>

            <Card className="p-4 border shadow-2xs bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="size-4 text-purple-600" /> Trainers & Instructors
              </span>
              <div className="text-2xl font-black font-mono text-purple-600">{trainers.length}</div>
              <p className="text-[11px] text-muted-foreground">Internal experts and external partners</p>
            </Card>

            <Card className="p-4 border shadow-2xs bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="size-4 text-amber-600" /> Training Cost Deductions
              </span>
              <div className="text-2xl font-black font-mono text-amber-600">
                ${sessions.reduce((acc: number, s: any) => acc + (Number(s.cost) || 0), 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">Logged & reconciled with Accounting Add-On</p>
            </Card>
          </div>

          <Card className="p-4 border shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Receipt className="size-4 text-emerald-600" /> Accounting Add-On Expense Reconciliation
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-mono">
                Automatic Ledger Integration Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              When a training program completes, its associated costs are automatically debited against your organizational expense accounts and tagged to the training's branch and department.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: CREATE / EDIT TRAINING SESSION ─── */}
      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              <span>{selectedSessionToEdit ? "Edit Training Program" : "Create Training Program"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule training sessions, assign trainers, set locations, and link expense costs.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sessionMutation.mutate(sessionForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Training Title *</Label>
              <Input
                required
                placeholder="e.g. Advanced Cybersecurity & ISO 27001 Compliance Workshop"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Training Type *</Label>
                <Select
                  value={sessionForm.trainingTypeId}
                  onValueChange={(v) => setSessionForm({ ...sessionForm, trainingTypeId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Trainer *</Label>
                <Select
                  value={sessionForm.trainerId}
                  onValueChange={(v) => {
                    const sel = trainers.find((t: any) => t.id === v);
                    setSessionForm({ ...sessionForm, trainerId: v, trainer: sel?.name || "" });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Trainer" /></SelectTrigger>
                  <SelectContent>
                    {trainers.map((tr: any) => (
                      <SelectItem key={tr.id} value={tr.id}>{tr.name} ({tr.trainerType || "Internal"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Branch *</Label>
                <Select
                  value={sessionForm.branchId}
                  onValueChange={(v) => setSessionForm({ ...sessionForm, branchId: v, departmentId: "" })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department *</Label>
                <Select
                  value={sessionForm.departmentId}
                  onValueChange={(v) => setSessionForm({ ...sessionForm, departmentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {filteredDeptsForSession.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input
                  type="date"
                  required
                  value={sessionForm.startDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input
                  type="date"
                  required
                  value={sessionForm.endDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Time</Label>
                <Input
                  type="time"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Time</Label>
                <Input
                  type="time"
                  value={sessionForm.endTime}
                  onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Max Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={sessionForm.capacity}
                  onChange={(e) => setSessionForm({ ...sessionForm, capacity: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Training Cost ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={sessionForm.cost}
                  onChange={(e) => setSessionForm({ ...sessionForm, cost: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Location / Delivery Mode *</Label>
              <Input
                required
                placeholder="e.g. Executive Boardroom / Zoom Room 482"
                value={sessionForm.location}
                onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status *</Label>
              <Select
                value={sessionForm.status}
                onValueChange={(v) => setSessionForm({ ...sessionForm, status: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed (Deducts Cost to Accounting)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                placeholder="Session curriculum goals, instructions for attendees..."
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddSessionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={sessionMutation.isPending} className="text-xs font-bold">
                {selectedSessionToEdit ? "Save Changes" : "Create Training"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: TRAINING TASKS MANAGEMENT (SPEC-COMPLIANT) ─── */}
      {selectedSessionForTasks && (
        <Dialog open={!!selectedSessionForTasks} onOpenChange={(o) => !o && setSelectedSessionForTasks(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ListTodo className="size-5 text-primary" />
                  <span>Tasks for: {selectedSessionForTasks.title}</span>
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-bold capitalize">
                  {selectedSessionForTasks.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Manage actionable employee assignments, deadlines, completion reviews, and feedback.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Assigned Tasks ({sessionTasks.length})</span>
                <Button
                  size="sm"
                  onClick={() => {
                    setTaskForm({
                      title: "",
                      assignedToId: employees[0]?.id || "",
                      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
                      description: "",
                    });
                    setSelectedTaskToEdit(null);
                    setIsAddTaskOpen(true);
                  }}
                  className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <Plus className="size-3" /> Create Task
                </Button>
              </div>

              <Card className="border shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="text-xs">Task Title</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isTasksLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs italic">
                          Loading training tasks...
                        </TableCell>
                      </TableRow>
                    ) : sessionTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs italic">
                          No tasks created yet for this training. Click "Create Task" above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessionTasks.map((task: any) => {
                        const isDone = task.status === "completed";
                        const feedbackCount = task._count?.feedbacks || 0;

                        return (
                          <TableRow key={task.id} className="hover:bg-muted/20 text-xs">
                            <TableCell className="font-bold text-foreground">
                              <div>
                                <span>{task.title}</span>
                                {task.description && (
                                  <p className="text-[10px] text-muted-foreground font-normal line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Assigned Staff"}
                            </TableCell>

                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {isDone ? "Completed" : "Pending"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isDone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markTaskCompleteMut.mutate(task.id)}
                                    className="h-6 text-[10px] font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                                  >
                                    <Check className="size-3" /> Mark Complete
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTaskForFeedback(task)}
                                  className="h-6 text-[10px] font-bold gap-1 text-primary border-primary/20"
                                >
                                  <MessageSquare className="size-3" />
                                  <span>Feedbacks ({feedbackCount})</span>
                                </Button>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(`Remove task "${task.title}"?`)) {
                                      deleteTaskMut.mutate(task.id);
                                    }
                                  }}
                                  className="size-6 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedSessionForTasks(null)}>
                Close Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: CREATE / EDIT TASK ─── */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ListTodo className="size-5 text-primary" />
              <span>Create Training Task</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              taskMutation.mutate(taskForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                required
                placeholder="e.g. Complete Risk Assessment Template"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assign Employee *</Label>
              <Select
                value={taskForm.assignedToId}
                onValueChange={(v) => setTaskForm({ ...taskForm, assignedToId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || "HR"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Due Date *</Label>
              <Input
                type="date"
                required
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                placeholder="Instructions, deliverable files required..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={taskMutation.isPending} className="text-xs font-bold">
                Assign Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: TASK FEEDBACKS (SPEC-COMPLIANT GRID & STAR RATINGS) ─── */}
      {selectedTaskForFeedback && (
        <Dialog open={!!selectedTaskForFeedback} onOpenChange={(o) => !o && setSelectedTaskForFeedback(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Star className="size-5 text-amber-500 fill-amber-500" />
                  <span>Feedbacks for: {selectedTaskForFeedback.title}</span>
                </DialogTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddFeedbackOpen(true)}
                  className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <Plus className="size-3" /> Add Feedback
                </Button>
              </div>
              <DialogDescription className="text-xs">
                Performance reviews, star evaluations, and feedback notes submitted for this task.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {isFeedbacksLoading ? (
                <div className="text-center text-muted-foreground py-8 text-xs italic">Loading feedbacks...</div>
              ) : taskFeedbacks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-xs italic">
                  No feedback recorded yet. Click "Add Feedback" above to leave a 1 to 5 star rating.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {taskFeedbacks.map((fb: any) => (
                    <Card key={fb.id} className="p-3 border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6 border">
                            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                              {(fb.userName || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-foreground">{fb.userName || "HR Reviewer"}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`size-3.5 ${star <= fb.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteFeedbackMut.mutate(fb.id)}
                            className="size-6 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-foreground bg-background p-2 rounded border">{fb.comments}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedTaskForFeedback(null)}>
                Back to Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: ADD FEEDBACK (1-5 STARS) ─── */}
      <Dialog open={isAddFeedbackOpen} onOpenChange={setIsAddFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Star className="size-5 text-amber-500 fill-amber-500" />
              <span>Leave Task Feedback</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              feedbackMutation.mutate(feedbackForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rating (1 to 5 Stars) *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`size-6 ${
                        star <= feedbackForm.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold text-foreground ml-2">
                  {feedbackForm.rating} of 5 Stars
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Comments & Review *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Describe execution quality, accuracy, and performance assessment..."
                value={feedbackForm.comments}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={feedbackMutation.isPending} className="text-xs font-bold">
                Submit Feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CREATE / EDIT TRAINING TYPE ─── */}
      <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <span>{selectedTypeToEdit ? "Edit Training Type" : "Create Training Type"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Classify training programs by branch and department structure.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              typeMutation.mutate(typeForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Type Name *</Label>
              <Input
                required
                placeholder="e.g. Leadership Development"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Branch *</Label>
                <Select
                  value={typeForm.branchId}
                  onValueChange={(v) => setTypeForm({ ...typeForm, branchId: v, departmentId: "" })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department *</Label>
                <Select
                  value={typeForm.departmentId}
                  onValueChange={(v) => setTypeForm({ ...typeForm, departmentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {filteredDeptsForType.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description *</Label>
              <Textarea
                required
                rows={2}
                placeholder="Curriculum scope, department requirements..."
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddTypeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={typeMutation.isPending} className="text-xs font-bold">
                {selectedTypeToEdit ? "Save Changes" : "Create Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CREATE / EDIT TRAINER ─── */}
      <Dialog open={isAddTrainerOpen} onOpenChange={setIsAddTrainerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span>{selectedTrainerToEdit ? "Edit Trainer" : "Create Trainer"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register internal staff or external domain expert trainers.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              trainerMutation.mutate(trainerForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Trainer Full Name *</Label>
              <Input
                required
                placeholder="e.g. Dr. Arthur Pendelton"
                value={trainerForm.name}
                onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Number</Label>
                <Input
                  placeholder="+1 (555) 234-5678"
                  value={trainerForm.contactNumber}
                  onChange={(e) => setTrainerForm({ ...trainerForm, contactNumber: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  required
                  placeholder="trainer@domain.com"
                  value={trainerForm.email}
                  onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Years of Experience</Label>
                <Input
                  type="number"
                  min="0"
                  value={trainerForm.experience}
                  onChange={(e) => setTrainerForm({ ...trainerForm, experience: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Trainer Classification</Label>
                <Select
                  value={trainerForm.trainerType}
                  onValueChange={(v) => setTrainerForm({ ...trainerForm, trainerType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Staff</SelectItem>
                    <SelectItem value="external">External Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Branch *</Label>
                <Select
                  value={trainerForm.branchId}
                  onValueChange={(v) => setTrainerForm({ ...trainerForm, branchId: v, departmentId: "" })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department *</Label>
                <Select
                  value={trainerForm.departmentId}
                  onValueChange={(v) => setTrainerForm({ ...trainerForm, departmentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {filteredDeptsForTrainer.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Expertise / Domain Areas *</Label>
              <Input
                required
                placeholder="e.g. Cloud Security, Penetration Testing, HIPAA"
                value={trainerForm.expertise}
                onChange={(e) => setTrainerForm({ ...trainerForm, expertise: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Qualifications & Credentials</Label>
              <Input
                placeholder="e.g. CISSP, AWS Security Specialist, Ph.D."
                value={trainerForm.qualifications}
                onChange={(e) => setTrainerForm({ ...trainerForm, qualifications: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddTrainerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={trainerMutation.isPending} className="text-xs font-bold">
                {selectedTrainerToEdit ? "Save Changes" : "Register Trainer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: PUBLISH COURSE ─── */}
      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              <span>Publish Academy Course</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCourseMut.mutate(courseForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Title *</Label>
              <Input
                required
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select
                  value={courseForm.category}
                  onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliance & Security">Compliance & Security</SelectItem>
                    <SelectItem value="Engineering & DevOps">Engineering & DevOps</SelectItem>
                    <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                    <SelectItem value="Leadership & Management">Leadership & Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Instructor</Label>
                <Input
                  value={courseForm.instructor}
                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duration (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={courseForm.durationHours}
                  onChange={(e) => setCourseForm({ ...courseForm, durationHours: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Passing Score (%)</Label>
                <Input
                  type="number"
                  value={courseForm.passingScore}
                  onChange={(e) => setCourseForm({ ...courseForm, passingScore: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createCourseMut.isPending} className="text-xs font-bold">
                Publish Course
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ENROLL STAFF ─── */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Enroll Staff Member</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enrollMut.mutate({
                courseId: enrollForm.courseId,
                employeeIds: enrollForm.employeeIds,
              });
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course *</Label>
              <Select
                value={enrollForm.courseId}
                onValueChange={(v) => setEnrollForm({ ...enrollForm, courseId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Employees *</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
                {employees.map((emp: any) => (
                  <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-muted/40 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollForm.employeeIds.includes(emp.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEnrollForm({
                          ...enrollForm,
                          employeeIds: checked
                            ? [...enrollForm.employeeIds, emp.id]
                            : enrollForm.employeeIds.filter((id) => id !== emp.id),
                        });
                      }}
                      className="rounded"
                    />
                    <span className="text-xs">{emp.firstName} {emp.lastName}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEnrollOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={enrollMut.isPending || enrollForm.employeeIds.length === 0} className="text-xs font-bold">
                Confirm Enrollment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: UPDATE PROGRESS ─── */}
      {isUpdateProgressOpen && enrollmentToUpdate && (
        <Dialog open={isUpdateProgressOpen} onOpenChange={setIsUpdateProgressOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Update Learning Progress</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProgressMut.mutate({
                  id: enrollmentToUpdate.id,
                  data: {
                    progressPercent: Number(progressForm.progressPercent),
                    score: Number(progressForm.score),
                  },
                });
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Progress Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={progressForm.progressPercent}
                  onChange={(e) => setProgressForm({ ...progressForm, progressPercent: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assessment Score (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={progressForm.score}
                  onChange={(e) => setProgressForm({ ...progressForm, score: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsUpdateProgressOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updateProgressMut.isPending} className="text-xs font-bold">
                  Save Progress
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: CURRICULUM PASSPORT ─── */}
      {selectedCoursePassport && (
        <Dialog open={!!selectedCoursePassport} onOpenChange={(o) => !o && setSelectedCoursePassport(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <span>Curriculum: {selectedCoursePassport.title}</span>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {selectedCoursePassport.category}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Instructor: {selectedCoursePassport.instructor}</span>
                  <span className="font-mono text-primary font-bold">{selectedCoursePassport.durationHours} Hours Total</span>
                </div>
                <p className="text-muted-foreground">{selectedCoursePassport.description}</p>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedCoursePassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: VERIFIED CERTIFICATE ─── */}
      {selectedCertificate && (
        <Dialog open={!!selectedCertificate} onOpenChange={(o) => !o && setSelectedCertificate(null)}>
          <DialogContent className="max-w-md text-center p-6 space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 grid place-items-center mx-auto text-emerald-600 shadow-inner">
              <Award className="size-8" />
            </div>

            <div className="space-y-1">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-black">
                Verified Digital Certificate
              </Badge>
              <h2 className="text-lg font-black text-foreground pt-1">Certificate of Completion</h2>
              <p className="text-xs text-muted-foreground">This certifies that</p>
            </div>

            <div className="text-xl font-extrabold text-primary border-y py-2">
              {selectedCertificate.employee?.firstName} {selectedCertificate.employee?.lastName}
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>has successfully completed the enterprise training course</p>
              <p className="font-bold text-foreground text-sm">{selectedCertificate.course?.title}</p>
              <p className="font-mono text-[11px]">Score: {selectedCertificate.score}% (Passed)</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 font-mono text-[11px] space-y-0.5 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificate ID:</span>
                <span className="font-bold text-foreground">{selectedCertificate.certificateId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issued Date:</span>
                <span>{new Date(selectedCertificate.certifiedAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button size="sm" onClick={() => setSelectedCertificate(null)} className="w-full text-xs font-bold">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default TrainingPage;
