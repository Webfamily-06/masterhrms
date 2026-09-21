import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Download,
  Eye,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  FileCheck,
  Video,
  FileText,
  UserPlus,
  Trash2,
  Edit2,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/training")({
  component: TrainingPage,
  head: () => ({ meta: [{ title: "LMS Training & Certifications — Master HRMS" }] }),
});

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Compliance & Security": { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  "Engineering & DevOps": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  "Sales & Marketing": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  "Leadership & Management": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
};

export function TrainingPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("courses");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedCoursePassport, setSelectedCoursePassport] = useState<any>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isUpdateProgressOpen, setIsUpdateProgressOpen] = useState(false);
  const [enrollmentToUpdate, setEnrollmentToUpdate] = useState<any>(null);

  // Forms
  const [courseForm, setCourseForm] = useState({
    title: "",
    category: "Compliance & Security",
    instructor: "",
    durationHours: "4.0",
    isMandatory: false,
    passingScore: "80",
    description: "",
    modules: [
      { orderIndex: 1, title: "Module 1: Introduction & Fundamentals", durationMinutes: 45, content: "" },
      { orderIndex: 2, title: "Module 2: Practical Implementation", durationMinutes: 60, content: "" },
    ],
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

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: courses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ["training-courses", tenantId, selectedCategory, searchQuery],
    queryFn: async () => {
      try {
        let url = `/training/courses?category=${selectedCategory}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ["training-enrollments", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/training/enrollments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["training-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/training/summary");
      } catch {
        return { totalCourses: 0, totalEnrolled: 0, completedCount: 0, complianceRate: 100 };
      }
    },
  });

  // Mutations
  const createCourseMut = useMutation({
    mutationFn: async (payload: any) => api.post("/training/courses", payload),
    onSuccess: () => {
      toast.success("Training course published successfully!");
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      qc.invalidateQueries({ queryKey: ["training-summary"] });
      setIsAddCourseOpen(false);
      resetCourseForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to publish course"),
  });

  const deleteCourseMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/training/courses/${id}`),
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      qc.invalidateQueries({ queryKey: ["training-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete course"),
  });

  const enrollMut = useMutation({
    mutationFn: async (payload: any) => api.post("/training/enrollments", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Staff enrolled successfully!");
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      qc.invalidateQueries({ queryKey: ["training-summary"] });
      setIsEnrollOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to enroll staff"),
  });

  const updateProgressMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      api.put(`/training/enrollments/${id}/progress`, data),
    onSuccess: (res: any) => {
      toast.success(res.message || "Learning progress updated!");
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      qc.invalidateQueries({ queryKey: ["training-summary"] });
      setIsUpdateProgressOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update progress"),
  });

  function resetCourseForm() {
    setCourseForm({
      title: "",
      category: "Compliance & Security",
      instructor: "",
      durationHours: "4.0",
      isMandatory: false,
      passingScore: "80",
      description: "",
      modules: [
        { orderIndex: 1, title: "Module 1: Introduction & Fundamentals", durationMinutes: 45, content: "" },
        { orderIndex: 2, title: "Module 2: Practical Implementation", durationMinutes: 60, content: "" },
      ],
    });
  }

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((en: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        en.course?.title?.toLowerCase().includes(q) ||
        en.employee?.firstName?.toLowerCase().includes(q) ||
        en.employee?.lastName?.toLowerCase().includes(q) ||
        en.certificateId?.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [enrollments, searchQuery]);

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <GraduationCap className="size-6 text-primary" /> Training & LMS Academy Suite
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage enterprise learning paths, mandatory compliance trainings, quiz scores, and digital certificates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            <span>Enroll Staff Members</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetCourseForm();
              setIsAddCourseOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Publish New Course</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-blue-500" /> Active Courses
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalCourses || courses.length} Courses
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-amber-500" /> Total Enrollments
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {summary?.totalEnrolled || enrollments.length} Learners
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <Award className="size-3.5" /> Certifications Issued
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.completedCount || 0} Certified
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-purple-500" /> Compliance Rate
          </span>
          <div className="text-xl font-black font-mono text-purple-600">
            {summary?.complianceRate || 100}% Completed
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-1 rounded-xl border">
          <TabsList className="bg-transparent h-8 p-0 gap-1">
            <TabsTrigger value="courses" className="text-xs font-bold h-7 gap-1.5">
              <BookOpen className="size-3.5" />
              <span>Course Catalog ({courses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="text-xs font-bold h-7 gap-1.5">
              <Award className="size-3.5" />
              <span>Enrollment & Certification Matrix ({enrollments.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course title, learner..."
                className="h-7 text-xs pl-8 w-48 bg-background"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-7 text-xs w-44 bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Compliance & Security">Compliance & Security</SelectItem>
                <SelectItem value="Engineering & DevOps">Engineering & DevOps</SelectItem>
                <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                <SelectItem value="Leadership & Management">Leadership & Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ===================== TAB 1: COURSE CATALOG ===================== */}
        <TabsContent value="courses" className="space-y-4 pt-1">
          {isCoursesLoading ? (
            <div className="py-20 text-center text-muted-foreground text-xs">
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border-dashed">
              <BookOpen className="size-10 mx-auto text-muted-foreground/50" />
              <h3 className="font-bold text-base">No courses found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click "Publish New Course" to add training modules to your company academy.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course: any) => {
                const col = CATEGORY_COLORS[course.category] || CATEGORY_COLORS["Compliance & Security"];
                return (
                  <Card
                    key={course.id}
                    className="p-5 border shadow-2xs hover:border-primary/50 transition-all bg-card flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold ${col.bg} ${col.text} ${col.border}`}>
                          {course.category}
                        </Badge>

                        {course.isMandatory && (
                          <Badge className="text-[10px] font-black bg-rose-600 text-white gap-1 shadow-2xs">
                            <ShieldCheck className="size-3" /> Mandatory
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground leading-snug">{course.title}</h3>
                        <span className="text-xs text-muted-foreground">Instructor: {course.instructor}</span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description || "Comprehensive enterprise training module."}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1 font-mono">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Clock className="size-3.5 text-primary" /> {course.durationHours} Hours
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <PlayCircle className="size-3.5 text-amber-500" /> {course.modules?.length || 0} Lessons
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <Users className="size-3.5" /> {course._count?.enrollments || 0} Enrolled
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCoursePassport(course)}
                        className="text-xs font-semibold h-8 gap-1.5 shadow-2xs"
                      >
                        <Eye className="size-3.5 text-primary" />
                        <span>Curriculum Syllabus</span>
                      </Button>

                      <div className="flex items-center gap-1">
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
                          className="text-xs font-bold h-8 gap-1.5"
                        >
                          <UserPlus className="size-3" />
                          <span>Enroll Staff</span>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete course "${course.title}"?`)) {
                              deleteCourseMut.mutate(course.id);
                            }
                          }}
                          className="size-8 text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 2: ENROLLMENTS & CERTIFICATIONS ===================== */}
        <TabsContent value="enrollments" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Staff Learner</TableHead>
                    <TableHead className="text-xs">Enrolled Course</TableHead>
                    <TableHead className="text-xs">Learning Progress</TableHead>
                    <TableHead className="text-xs text-center">Score</TableHead>
                    <TableHead className="text-xs">Certification Status</TableHead>
                    <TableHead className="text-xs">Certificate ID</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isEnrollmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                        Loading enrollments...
                      </TableCell>
                    </TableRow>
                  ) : filteredEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                        No enrollments found. Click "Enroll Staff Members" to assign courses.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEnrollments.map((en: any) => (
                      <TableRow key={en.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7 border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {en.employee?.firstName?.[0]}
                                {en.employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground block">
                                {en.employee?.firstName} {en.employee?.lastName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {en.employee?.department?.name || "General"} · {en.employee?.employeeCode}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block max-w-[200px] truncate">{en.course?.title}</span>
                            <span className="text-[10px] text-muted-foreground">{en.course?.category}</span>
                          </div>
                        </TableCell>

                        <TableCell className="w-[180px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span>{en.progressPercent}% Completed</span>
                            </div>
                            <Progress value={en.progressPercent} className="h-1.5" />
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold">
                          {en.score ? `${en.score}%` : "—"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold capitalize ${
                              en.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : en.status === "in_progress"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {en.status === "completed" ? "✓ Certified" : en.status.replace("_", " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {en.certificateId || "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {en.status === "completed" && en.certificateId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCertificate(en)}
                                className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30 gap-1"
                              >
                                <Award className="size-3" /> Certificate
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEnrollmentToUpdate(en);
                                setProgressForm({
                                  progressPercent: String(en.progressPercent),
                                  score: String(en.score || 85),
                                });
                                setIsUpdateProgressOpen(true);
                              }}
                              className="h-6 text-[10px] font-bold gap-1"
                            >
                              <Edit2 className="size-3" /> Update
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
      </Tabs>

      {/* ─── MODAL 1: PUBLISH NEW COURSE ─── */}
      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              <span>Publish Academy Course</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add new curriculum, instructor details, and passing criteria for employees.
            </DialogDescription>
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
                placeholder="e.g. Cloud Security Architecture & DevSecOps"
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
                <Label className="text-xs font-semibold">Instructor / Author</Label>
                <Input
                  placeholder="e.g. Lead Enterprise Architect"
                  value={courseForm.instructor}
                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estimated Duration (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={courseForm.durationHours}
                  onChange={(e) => setCourseForm({ ...courseForm, durationHours: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Passing Score Threshold (%)</Label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={courseForm.passingScore}
                  onChange={(e) => setCourseForm({ ...courseForm, passingScore: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Description</Label>
              <Textarea
                rows={2}
                placeholder="Learning objectives, prerequisite skills, and expected outcomes..."
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Mandatory Compliance Training</span>
                <span className="text-[10px] text-muted-foreground">Flags course as mandatory for employee compliance audits</span>
              </div>
              <input
                type="checkbox"
                checked={courseForm.isMandatory}
                onChange={(e) => setCourseForm({ ...courseForm, isMandatory: e.target.checked })}
                className="size-4 text-primary rounded"
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

      {/* ─── MODAL 2: ENROLL STAFF MEMBERS ─── */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Enroll Staff into Course</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const targetIds =
                enrollForm.departmentId === "all"
                  ? employees.map((emp: any) => emp.id)
                  : employees.filter((emp: any) => emp.department_id === enrollForm.departmentId).map((emp: any) => emp.id);

              if (targetIds.length === 0) {
                toast.error("No employees found to enroll.");
                return;
              }

              enrollMut.mutate({
                courseId: enrollForm.courseId,
                employeeIds: targetIds,
              });
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Course *</Label>
              <Select
                required
                value={enrollForm.courseId}
                onValueChange={(v) => setEnrollForm({ ...enrollForm, courseId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Department *</Label>
              <Select
                value={enrollForm.departmentId}
                onValueChange={(v) => setEnrollForm({ ...enrollForm, departmentId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire Workforce ({employees.length} Staff)</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} Department
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEnrollOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={enrollMut.isPending} className="text-xs font-bold">
                Confirm Enrollment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: UPDATE LEARNING PROGRESS & QUIZ SCORE ─── */}
      {enrollmentToUpdate && (
        <Dialog open={isUpdateProgressOpen} onOpenChange={setIsUpdateProgressOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" />
                <span>Update Learning Progress</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Learner: {enrollmentToUpdate.employee?.firstName} {enrollmentToUpdate.employee?.lastName}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProgressMut.mutate({
                  id: enrollmentToUpdate.id,
                  data: progressForm,
                });
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Course Progress (0% to 100%)</Label>
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
                <span className="text-[10px] text-muted-foreground">
                  Passing score required: {enrollmentToUpdate.course?.passingScore || 80}%
                </span>
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

      {/* ─── MODAL 4: COURSE CURRICULUM PASSPORT ─── */}
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

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lesson Modules ({selectedCoursePassport.modules?.length || 0})
                </Label>
                {selectedCoursePassport.modules?.map((m: any, idx: number) => (
                  <div key={m.id || idx} className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="size-6 rounded-md bg-primary/10 text-primary font-black grid place-items-center shrink-0 text-xs">
                        {m.orderIndex || idx + 1}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground">{m.title}</div>
                        {m.content && <p className="text-[11px] text-muted-foreground">{m.content}</p>}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {m.durationMinutes} mins
                    </Badge>
                  </div>
                ))}
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

      {/* ─── MODAL 5: DIGITAL VERIFIED CERTIFICATE ─── */}
      {selectedCertificate && (
        <Dialog open={!!selectedCertificate} onOpenChange={(o) => !o && setSelectedCertificate(null)}>
          <DialogContent className="max-w-md text-center p-6 space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 grid place-items-center mx-auto text-emerald-600 shadow-inner">
              <Award className="size-8" />
            </div>

            <div className="space-y-1">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-black">
                ✓ Verified Digital Certificate
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
