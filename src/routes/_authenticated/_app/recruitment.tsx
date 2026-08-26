import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Briefcase,
  Users,
  UserPlus,
  Plus,
  Search,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Star,
  CheckCircle2,
  Share2,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Award,
  Video,
  FileText,
  Mail,
  Phone,
  Globe,
  Trash2,
  Edit2,
  Sparkles,
  Link as LinkIcon,
  Copy,
  ShieldCheck,
  Eye,
  ArrowRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/recruitment")({
  component: RecruitmentHub,
  head: () => ({
    meta: [
      { title: "Recruitment & ATS Hub — Master HRMS" },
      { name: "description", content: "Manage job postings, candidate pipelines, and automated employee onboarding." },
    ],
  }),
});

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied", color: "border-blue-500/30 bg-blue-500/5 text-blue-600", dot: "bg-blue-500" },
  { key: "screening", label: "Screening", color: "border-amber-500/30 bg-amber-500/5 text-amber-600", dot: "bg-amber-500" },
  { key: "interview", label: "Interview", color: "border-purple-500/30 bg-purple-500/5 text-purple-600", dot: "bg-purple-500" },
  { key: "offered", label: "Offer Extended", color: "border-indigo-500/30 bg-indigo-500/5 text-indigo-600", dot: "bg-indigo-500" },
  { key: "hired", label: "Hired", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600", dot: "bg-emerald-500" },
  { key: "rejected", label: "Archived / Rejected", color: "border-rose-500/30 bg-rose-500/5 text-rose-600", dot: "bg-rose-500" },
];

function RecruitmentHub() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const tenantSlug = profile?.tenant?.slug || "workspace";

  const [activeTab, setActiveTab] = useState<"kanban" | "jobs" | "candidates">("kanban");
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isEditJobOpen, setIsEditJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);

  // Form states
  const [jobForm, setJobForm] = useState({
    title: "",
    departmentId: "",
    location: "Remote",
    employmentType: "full_time",
    experienceLevel: "Mid-Level",
    salaryMin: "",
    salaryMax: "",
    openingsCount: "1",
    status: "published",
    closingDate: "",
    description: "",
    requirements: "",
    benefits: "",
  });

  const [candidateForm, setCandidateForm] = useState({
    jobPostingId: "",
    fullName: "",
    email: "",
    phone: "",
    currentCompany: "",
    yearsOfExperience: "2",
    expectedSalary: "",
    portfolioUrl: "",
    resumeUrl: "",
    coverLetter: "",
    stage: "applied",
  });

  const [interviewForm, setInterviewForm] = useState({
    interviewerId: "",
    interviewType: "Technical Round 1",
    scheduledAt: "",
    meetingLink: "",
    feedback: "",
  });

  const [scorecardRating, setScorecardRating] = useState(4);
  const [scorecardNotes, setScorecardNotes] = useState("");

  // System settings query for currency
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  // Query Departments
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

  // Query Staff Employees (for interviewers)
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

  // Query Job Postings
  const { data: jobs = [], isLoading: isJobsLoading } = useQuery({
    queryKey: ["recruitment-jobs", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/recruitment/jobs");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Query Candidates Pipeline
  const { data: candidates = [], isLoading: isCandidatesLoading } = useQuery({
    queryKey: ["recruitment-candidates", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/recruitment/candidates");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createJobMut = useMutation({
    mutationFn: async (payload: any) => api.post("/recruitment/jobs", payload),
    onSuccess: () => {
      toast.success("Job opening published successfully!");
      qc.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      setIsCreateJobOpen(false);
      resetJobForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create job posting"),
  });

  const updateJobMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/recruitment/jobs/${id}`, data),
    onSuccess: () => {
      toast.success("Job opening updated successfully!");
      qc.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      setIsEditJobOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update job posting"),
  });

  const deleteJobMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/recruitment/jobs/${id}`),
    onSuccess: () => {
      toast.success("Job opening deleted");
      qc.invalidateQueries({ queryKey: ["recruitment-jobs"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete job"),
  });

  const updateStageMut = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) =>
      api.put(`/recruitment/candidates/${id}/stage`, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidate stage updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update stage"),
  });

  const updateScorecardMut = useMutation({
    mutationFn: async ({ id, rating, interviewerNotes }: { id: string; rating: number; interviewerNotes: string }) =>
      api.put(`/recruitment/candidates/${id}/scorecard`, { rating, interviewerNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidate scorecard rating saved!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save scorecard"),
  });

  const convertToEmployeeMut = useMutation({
    mutationFn: async (id: string) => api.post(`/recruitment/candidates/${id}/convert-to-employee`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Candidate converted to active employee!");
      qc.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (selectedCandidate) {
        setSelectedCandidate({ ...selectedCandidate, isConvertedToEmployee: true, stage: "hired" });
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to convert candidate to employee"),
  });

  const createCandidateMut = useMutation({
    mutationFn: async (payload: any) => api.post("/recruitment/candidates", payload),
    onSuccess: () => {
      toast.success("Candidate profile added to pipeline!");
      qc.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      setIsAddCandidateOpen(false);
      resetCandidateForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to add candidate"),
  });

  const scheduleInterviewMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      api.post(`/recruitment/candidates/${id}/interviews`, data),
    onSuccess: () => {
      toast.success("Interview scheduled successfully!");
      qc.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      setIsScheduleInterviewOpen(false);
      setInterviewForm({ interviewerId: "", interviewType: "Technical Round 1", scheduledAt: "", meetingLink: "", feedback: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed to schedule interview"),
  });

  function resetJobForm() {
    setJobForm({
      title: "",
      departmentId: "",
      location: "Remote",
      employmentType: "full_time",
      experienceLevel: "Mid-Level",
      salaryMin: "",
      salaryMax: "",
      openingsCount: "1",
      status: "published",
      closingDate: "",
      description: "",
      requirements: "",
      benefits: "",
    });
  }

  function resetCandidateForm() {
    setCandidateForm({
      jobPostingId: "",
      fullName: "",
      email: "",
      phone: "",
      currentCompany: "",
      yearsOfExperience: "2",
      expectedSalary: "",
      portfolioUrl: "",
      resumeUrl: "",
      coverLetter: "",
      stage: "applied",
    });
  }

  function copyPublicJobLink(jobSlug: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/careers?tenant=${tenantSlug}&job=${jobSlug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("Public job application link copied to clipboard!");
    }
  }

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      const matchesJob = selectedJobFilter === "all" || c.jobPostingId === selectedJobFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.fullName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.currentCompany?.toLowerCase().includes(q) ||
        c.jobPosting?.title?.toLowerCase().includes(q);
      return matchesJob && matchesSearch;
    });
  }, [candidates, selectedJobFilter, searchQuery]);

  // Aggregate Metrics
  const totalApplicants = candidates.length;
  const inInterviewCount = candidates.filter((c: any) => c.stage === "interview").length;
  const offeredCount = candidates.filter((c: any) => c.stage === "offered").length;
  const hiredCount = candidates.filter((c: any) => c.stage === "hired").length;
  const activeJobsCount = jobs.filter((j: any) => j.status === "published").length;

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Briefcase className="size-6 text-primary" /> Recruitment & Applicant Tracking (ATS)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage job postings, visual recruitment stages, candidate scorecards, and 1-click staff onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              window.open(`${origin}/careers?tenant=${tenantSlug}`, "_blank");
            }}
            className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
          >
            <Globe className="size-3.5 text-primary" />
            <span>Public Careers Board</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddCandidateOpen(true)}
            variant="outline"
            className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
          >
            <UserPlus className="size-3.5" />
            <span>Add Candidate</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetJobForm();
              setIsCreateJobOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Create Job Opening</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-blue-500" /> Active Openings
          </span>
          <div className="text-xl font-black font-mono text-foreground">{activeJobsCount} Jobs</div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-amber-500" /> Total Pipeline
          </span>
          <div className="text-xl font-black font-mono text-foreground">{totalApplicants} Candidates</div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Video className="size-3.5 text-purple-500" /> In Interviews
          </span>
          <div className="text-xl font-black font-mono text-purple-600">{inInterviewCount}</div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Award className="size-3.5 text-indigo-500" /> Offers Extended
          </span>
          <div className="text-xl font-black font-mono text-indigo-600">{offeredCount}</div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 col-span-2 sm:col-span-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <UserCheck className="size-3.5" /> Hired & Onboarded
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">{hiredCount} Staff</div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-1 rounded-xl border">
          <TabsList className="bg-transparent h-8 p-0 gap-1">
            <TabsTrigger value="kanban" className="text-xs font-bold h-7 gap-1.5">
              <Filter className="size-3.5" />
              <span>Pipeline Kanban Board</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs font-bold h-7 gap-1.5">
              <Briefcase className="size-3.5" />
              <span>Job Openings ({jobs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="candidates" className="text-xs font-bold h-7 gap-1.5">
              <Users className="size-3.5" />
              <span>All Candidates ({candidates.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Top Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, email..."
                className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
              />
            </div>

            <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
              <SelectTrigger className="h-7 text-xs w-44 bg-background">
                <SelectValue placeholder="All Job Openings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Positions</SelectItem>
                {jobs.map((j: any) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ===================== TAB 1: KANBAN PIPELINE BOARD ===================== */}
        <TabsContent value="kanban" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((col) => {
              const stageCandidates = filteredCandidates.filter((c: any) => c.stage === col.key);

              return (
                <div key={col.key} className="flex flex-col rounded-xl border bg-muted/20 min-w-[240px] max-w-[280px]">
                  {/* Column Header */}
                  <div className={`p-2.5 border-b rounded-t-xl flex items-center justify-between font-bold text-xs ${col.color}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${col.dot}`} />
                      <span>{col.label}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] bg-background/80">
                      {stageCandidates.length}
                    </Badge>
                  </div>

                  {/* Column Body Cards */}
                  <div className="p-2 space-y-2.5 flex-1 min-h-[450px] max-h-[700px] overflow-y-auto">
                    {stageCandidates.length === 0 ? (
                      <div className="h-28 border border-dashed rounded-lg grid place-items-center text-muted-foreground/60 text-[11px] italic">
                        No candidates
                      </div>
                    ) : (
                      stageCandidates.map((c: any) => (
                        <Card
                          key={c.id}
                          onClick={() => {
                            setSelectedCandidate(c);
                            setScorecardRating(c.rating || 4);
                            setScorecardNotes(c.interviewerNotes || "");
                          }}
                          className="p-3 border shadow-2xs hover:border-primary/60 cursor-pointer transition-all bg-card space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-foreground truncate">{c.fullName}</div>
                              <div className="text-[10px] text-muted-foreground truncate font-mono">{c.email}</div>
                            </div>

                            <Avatar className="size-6 shrink-0 border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {c.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="text-muted-foreground flex items-center gap-1 truncate">
                              <Briefcase className="size-3 shrink-0 text-primary" />
                              <span className="font-semibold text-foreground truncate">
                                {c.jobPosting?.title || "Role"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Exp: {c.yearsOfExperience || 0} yrs</span>
                              <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="size-3 fill-amber-400 text-amber-400" />
                                <span>{(c.rating || 0).toFixed(1)}</span>
                              </div>
                            </div>

                            {c.expectedSalary && (
                              <div className="font-mono text-[10px] font-bold text-emerald-600">
                                Exp: {formatSystemAmount(Number(c.expectedSalary), sysConfig?.currency)}
                              </div>
                            )}
                          </div>

                          {/* Quick Stage Mover */}
                          <div className="pt-2 border-t flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                            {c.isConvertedToEmployee ? (
                              <Badge className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                                ✓ Staff Member
                              </Badge>
                            ) : (
                              <Select
                                value={c.stage}
                                onValueChange={(newStage) => updateStageMut.mutate({ id: c.id, stage: newStage })}
                              >
                                <SelectTrigger className="h-6 text-[10px] px-2 w-full font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PIPELINE_STAGES.map((s) => (
                                    <SelectItem key={s.key} value={s.key} className="text-xs">
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ===================== TAB 2: JOB OPENINGS STUDIO ===================== */}
        <TabsContent value="jobs" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Position Title</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Location & Type</TableHead>
                    <TableHead className="text-xs">Experience</TableHead>
                    <TableHead className="text-xs">Salary Bracket</TableHead>
                    <TableHead className="text-xs text-center">Applicants</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isJobsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-xs">
                        Loading job openings...
                      </TableCell>
                    </TableRow>
                  ) : jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-xs italic">
                        No job openings found. Click "Create Job Opening" to publish one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job: any) => (
                      <TableRow key={job.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block">{job.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">/careers/{tenantSlug}/{job.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-muted-foreground">{job.department?.name || "General"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="size-3 text-muted-foreground" /> {job.location}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {job.employmentType.replace("_", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {job.experienceLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">
                          {job.salaryMin || job.salaryMax ? (
                            <>
                              {formatSystemAmount(Number(job.salaryMin) || 0, sysConfig?.currency)} - {formatSystemAmount(Number(job.salaryMax) || 0, sysConfig?.currency)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Competitive</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs">
                          {job._count?.candidates || 0}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              job.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => copyPublicJobLink(job.slug)}
                              title="Copy Public Apply Link"
                            >
                              <Copy className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => {
                                setEditingJob(job);
                                setIsEditJobOpen(true);
                              }}
                              title="Edit Job"
                            >
                              <Edit2 className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => {
                                if (confirm(`Delete job opening "${job.title}"?`)) {
                                  deleteJobMut.mutate(job.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
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

        {/* ===================== TAB 3: CANDIDATES DIRECTORY ===================== */}
        <TabsContent value="candidates" className="space-y-4 pt-1">
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Candidate Name</TableHead>
                    <TableHead className="text-xs">Applied Role</TableHead>
                    <TableHead className="text-xs">Experience & Company</TableHead>
                    <TableHead className="text-xs">Expected Salary</TableHead>
                    <TableHead className="text-xs">Rating</TableHead>
                    <TableHead className="text-xs">Stage</TableHead>
                    <TableHead className="text-xs">Staff Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCandidatesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-xs">
                        Loading candidates...
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-xs italic">
                        No candidates match filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((c: any) => (
                      <TableRow key={c.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7 border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {c.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground block">{c.fullName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{c.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{c.jobPosting?.title || "Role"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {c.yearsOfExperience || 0} yrs · {c.currentCompany || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-emerald-600">
                          {c.expectedSalary ? formatSystemAmount(Number(c.expectedSalary), sysConfig?.currency) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-amber-500 font-bold font-mono">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            <span>{(c.rating || 0).toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold capitalize">
                            {c.stage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.isConvertedToEmployee ? (
                            <Badge className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              ✓ Converted to Staff
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCandidate(c);
                              setScorecardRating(c.rating || 4);
                              setScorecardNotes(c.interviewerNotes || "");
                            }}
                            className="text-xs h-7 px-2 shadow-2xs font-semibold gap-1"
                          >
                            <Eye className="size-3" /> View Passport
                          </Button>
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

      {/* ─── MODAL 1: CANDIDATE EVALUATION PASSPORT DRAWER ─── */}
      {selectedCandidate && (
        <Dialog open={!!selectedCandidate} onOpenChange={(o) => !o && setSelectedCandidate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-5 text-primary" />
                  <span>Candidate Evaluation Passport</span>
                </div>
                {selectedCandidate.isConvertedToEmployee && (
                  <Badge className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    ✓ Active Employee
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review candidate credentials, scorecard ratings, interview history, and convert to staff.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Profile Card Header */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-indigo-500/5 border flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-14 border-2 border-primary/20">
                    <AvatarFallback className="font-bold text-lg bg-primary text-primary-foreground">
                      {selectedCandidate.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-base font-extrabold text-foreground">{selectedCandidate.fullName}</div>
                    <div className="text-xs font-semibold text-primary">{selectedCandidate.jobPosting?.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{selectedCandidate.email}</span>
                      <span>•</span>
                      <span>{selectedCandidate.phone || "No phone"}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <Badge variant="outline" className="font-bold text-xs capitalize">
                    Stage: {selectedCandidate.stage}
                  </Badge>
                  {selectedCandidate.expectedSalary && (
                    <div className="font-mono text-xs font-bold text-emerald-600">
                      Exp: {formatSystemAmount(Number(selectedCandidate.expectedSalary), sysConfig?.currency)}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Inside Passport */}
              <Tabs defaultValue="overview" className="space-y-3">
                <TabsList className="bg-muted/40 h-8 p-0.5">
                  <TabsTrigger value="overview" className="text-xs h-7">Overview & Resume</TabsTrigger>
                  <TabsTrigger value="scorecard" className="text-xs h-7">Scorecard Rating</TabsTrigger>
                  <TabsTrigger value="interviews" className="text-xs h-7">
                    Interviews ({selectedCandidate.interviews?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Overview */}
                <TabsContent value="overview" className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">Experience</span>
                      <div className="font-bold text-xs">{selectedCandidate.yearsOfExperience || 0} Years</div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">Current Organization</span>
                      <div className="font-bold text-xs">{selectedCandidate.currentCompany || "Not specified"}</div>
                    </div>
                  </div>

                  {selectedCandidate.coverLetter && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Cover Letter / Note</Label>
                      <div className="p-3 rounded-lg border bg-muted/10 text-xs text-muted-foreground leading-relaxed">
                        {selectedCandidate.coverLetter}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.resumeUrl && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedCandidate.resumeUrl, "_blank")}
                        className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
                      >
                        <FileText className="size-3.5 text-primary" />
                        <span>View / Download Resume Document</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Scorecard */}
                <TabsContent value="scorecard" className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Overall Fitment Rating (1 to 5 Stars)</Label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setScorecardRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`size-5 ${
                                star <= scorecardRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Interviewer Feedback & Notes</Label>
                      <Textarea
                        rows={3}
                        value={scorecardNotes}
                        onChange={(e) => setScorecardNotes(e.target.value)}
                        placeholder="Key technical competencies, communication skills, and hiring recommendation..."
                        className="text-xs"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        updateScorecardMut.mutate({
                          id: selectedCandidate.id,
                          rating: scorecardRating,
                          interviewerNotes: scorecardNotes,
                        })
                      }
                      disabled={updateScorecardMut.isPending}
                      className="text-xs font-bold h-8"
                    >
                      Save Scorecard
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Interviews */}
                <TabsContent value="interviews" className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Scheduled Interview Rounds</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsScheduleInterviewOpen(true)}
                      className="text-xs font-semibold h-7 gap-1"
                    >
                      <Plus className="size-3" /> Schedule Round
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {selectedCandidate.interviews?.length === 0 ? (
                      <div className="p-4 border rounded-lg text-center text-muted-foreground text-xs italic">
                        No interviews scheduled yet.
                      </div>
                    ) : (
                      selectedCandidate.interviews?.map((int: any) => (
                        <div key={int.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-foreground">{int.interviewType}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {int.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-primary" />
                              {new Date(int.scheduledAt).toLocaleString()}
                            </span>
                            {int.interviewer && (
                              <span>
                                Interviewer: {int.interviewer.firstName} {int.interviewer.lastName}
                              </span>
                            )}
                          </div>
                          {int.meetingLink && (
                            <a
                              href={int.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline flex items-center gap-1"
                            >
                              <Video className="size-3" /> Join Meeting Link
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap pt-2 border-t">
              {!selectedCandidate.isConvertedToEmployee ? (
                <Button
                  size="sm"
                  onClick={() => convertToEmployeeMut.mutate(selectedCandidate.id)}
                  disabled={convertToEmployeeMut.isPending}
                  className="text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 mr-auto shadow-sm"
                >
                  <UserPlus className="size-3.5" />
                  <span>1-Click Convert to Employee (Staff)</span>
                </Button>
              ) : (
                <Badge className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 mr-auto">
                  ✓ Converted to Employee
                </Badge>
              )}

              <Button size="sm" variant="outline" onClick={() => setSelectedCandidate(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 2: CREATE JOB OPENING ─── */}
      <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              <span>Create & Publish Job Opening</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish a new career opening to your company job board and candidate portal.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createJobMut.mutate(jobForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Position Title *</Label>
              <Input
                required
                placeholder="e.g. Senior Full-Stack Engineer, Product Designer"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department</Label>
                <Select
                  value={jobForm.departmentId}
                  onValueChange={(v) => setJobForm({ ...jobForm, departmentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Location</Label>
                <Input
                  placeholder="e.g. Remote, Bangalore, Hybrid"
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employment Type</Label>
                <Select
                  value={jobForm.employmentType}
                  onValueChange={(v) => setJobForm({ ...jobForm, employmentType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Experience Level</Label>
                <Select
                  value={jobForm.experienceLevel}
                  onValueChange={(v) => setJobForm({ ...jobForm, experienceLevel: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entry">Entry Level (0-2 yrs)</SelectItem>
                    <SelectItem value="Mid-Level">Mid-Level (2-5 yrs)</SelectItem>
                    <SelectItem value="Senior">Senior (5-8 yrs)</SelectItem>
                    <SelectItem value="Lead">Lead / Principal (8+ yrs)</SelectItem>
                    <SelectItem value="Executive">Executive / Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Open Slots</Label>
                <Input
                  type="number"
                  min="1"
                  value={jobForm.openingsCount}
                  onChange={(e) => setJobForm({ ...jobForm, openingsCount: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Min Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={jobForm.salaryMin}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Max Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
                  value={jobForm.salaryMax}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Job Description *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Overview of the position responsibilities..."
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Key Requirements & Skills</Label>
              <Textarea
                rows={2}
                placeholder="Required technical qualifications, degrees, skills..."
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCreateJobOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createJobMut.isPending} className="text-xs font-bold">
                Publish Opening
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: MANUAL CANDIDATE REGISTRATION ─── */}
      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Add Candidate to Pipeline</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually add a candidate or referral into the recruitment pipeline.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCandidateMut.mutate(candidateForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Applying For Job Opening *</Label>
              <Select
                required
                value={candidateForm.jobPostingId}
                onValueChange={(v) => setCandidateForm({ ...candidateForm, jobPostingId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose Job Position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} ({j.department?.name || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Candidate Full Name *</Label>
              <Input
                required
                placeholder="e.g. Rahul Sharma"
                value={candidateForm.fullName}
                onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="name@email.com"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Years of Experience</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={candidateForm.yearsOfExperience}
                  onChange={(e) => setCandidateForm({ ...candidateForm, yearsOfExperience: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expected Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 60000"
                  value={candidateForm.expectedSalary}
                  onChange={(e) => setCandidateForm({ ...candidateForm, expectedSalary: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddCandidateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createCandidateMut.isPending} className="text-xs font-bold">
                Add to Pipeline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: SCHEDULE INTERVIEW ─── */}
      <Dialog open={isScheduleInterviewOpen} onOpenChange={setIsScheduleInterviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Video className="size-5 text-purple-600" />
              <span>Schedule Interview Round</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              scheduleInterviewMut.mutate({ id: selectedCandidate.id, data: interviewForm });
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Interview Round Name *</Label>
              <Input
                required
                placeholder="e.g. Technical System Design, HR Cultural Fitment"
                value={interviewForm.interviewType}
                onChange={(e) => setInterviewForm({ ...interviewForm, interviewType: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Staff Interviewer</Label>
              <Select
                value={interviewForm.interviewerId}
                onValueChange={(v) => setInterviewForm({ ...interviewForm, interviewerId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Staff Member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Date & Time *</Label>
              <Input
                required
                type="datetime-local"
                value={interviewForm.scheduledAt}
                onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Meeting Link (Google Meet / Zoom)</Label>
              <Input
                placeholder="https://meet.google.com/xyz-abcd-efg"
                value={interviewForm.meetingLink}
                onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsScheduleInterviewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={scheduleInterviewMut.isPending} className="text-xs font-bold">
                Confirm Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
