import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAddon } from "@/hooks/use-addon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Award,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Zap,
  Target,
  Users,
  Star,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/performance-appraisal")({
  validateSearch: z.object({
    id: z.string().optional(),
  }),
  component: PerformanceAppraisalPage,
  head: () => ({
    meta: [{ title: "Performance Appraisal — Master HRMS" }],
  }),
});

const COMPETENCY_LEVELS = ["None", "Beginner", "Intermediate", "Advanced", "Expert"];

const TECHNICAL_COMPETENCIES = [
  { key: "customerExperience", label: "Customer Experience" },
  { key: "marketing", label: "Marketing" },
  { key: "management", label: "Management" },
  { key: "administration", label: "Administration" },
  { key: "presentationSkills", label: "Presentation Skills" },
  { key: "qualityOfWork", label: "Quality of Work" },
  { key: "efficiency", label: "Efficiency" },
];

const ORGANIZATIONAL_COMPETENCIES = [
  { key: "integrity", label: "Integrity" },
  { key: "professionalism", label: "Professionalism" },
  { key: "teamWork", label: "Team Work" },
  { key: "criticalThinking", label: "Critical Thinking" },
  { key: "conflictManagement", label: "Conflict Management" },
  { key: "attendance", label: "Attendance" },
  { key: "abilityToMeetDeadline", label: "Ability To Meet Deadline" },
];

export function PerformanceAppraisalPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEntitled, isTrial, startTrial, isStartingTrial, subscribe, isSubscribing } =
    useAddon("okr-performance");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<any>(null);

  // Form state
  const initialForm = {
    employeeId: "",
    appraisalDate: new Date().toISOString().slice(0, 10),
    status: "active",
    ratingScore: 4.0,
    remarks: "",
    customerExperience: "Intermediate",
    marketing: "Intermediate",
    management: "Intermediate",
    administration: "Intermediate",
    presentationSkills: "Intermediate",
    qualityOfWork: "Intermediate",
    efficiency: "Intermediate",
    integrity: "Intermediate",
    professionalism: "Intermediate",
    teamWork: "Intermediate",
    criticalThinking: "Intermediate",
    conflictManagement: "Intermediate",
    attendance: "Intermediate",
    abilityToMeetDeadline: "Intermediate",
  };
  const [formData, setFormData] = useState(initialForm);

  // Queries
  const { data: appraisalsData, isLoading } = useQuery({
    queryKey: ["performance-appraisals", selectedDepartment, selectedStatus, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedDepartment && selectedDepartment !== "all") params.append("department", selectedDepartment);
        if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        const res = await api.get(`/addons/okr/appraisals?${params.toString()}`);
        return res?.appraisals || [];
      } catch (err: any) {
        toast.error("Failed to load appraisals: " + err.message);
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-lookup"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return res?.employees || res || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-lookup"],
    queryFn: async () => {
      try {
        const res = await api.get("/departments");
        return res?.departments || res || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const appraisalsList: any[] = appraisalsData || [];

  // Deep linking: auto-open passport if `id` query parameter is supplied
  useEffect(() => {
    if (searchParams.id && appraisalsList.length > 0) {
      const match = appraisalsList.find((a) => a.id === searchParams.id);
      if (match) {
        setSelectedAppraisal(match);
        setIsPassportModalOpen(true);
      }
    }
  }, [searchParams.id, appraisalsList]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof initialForm) => {
      return await api.post("/addons/okr/appraisals", payload);
    },
    onSuccess: () => {
      toast.success("Employee Performance Appraisal created successfully!");
      setIsAddModalOpen(false);
      setFormData(initialForm);
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create appraisal.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof initialForm }) => {
      return await api.put(`/addons/okr/appraisals/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Appraisal record updated successfully!");
      setIsEditModalOpen(false);
      setSelectedAppraisal(null);
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update appraisal.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/addons/okr/appraisals/${id}`);
    },
    onSuccess: () => {
      toast.success("Appraisal removed successfully.");
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete appraisal.");
    },
  });

  // Metrics
  const totalAppraisals = appraisalsList.length;
  const activeAppraisals = appraisalsList.filter((a) => a.status === "active").length;
  const averageScore =
    totalAppraisals > 0
      ? (appraisalsList.reduce((sum, a) => sum + Number(a.ratingScore || 0), 0) / totalAppraisals).toFixed(1)
      : "0.0";
  const topPerformers = appraisalsList.filter((a) => Number(a.ratingScore || 0) >= 4.5).length;

  const handleOpenEdit = (appraisal: any) => {
    setSelectedAppraisal(appraisal);
    setFormData({
      employeeId: appraisal.employeeId || "",
      appraisalDate: appraisal.appraisalDate ? new Date(appraisal.appraisalDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: appraisal.status || "active",
      ratingScore: appraisal.ratingScore || 4.0,
      remarks: appraisal.remarks || "",
      customerExperience: appraisal.technical?.customerExperience || "Intermediate",
      marketing: appraisal.technical?.marketing || "Intermediate",
      management: appraisal.technical?.management || "Intermediate",
      administration: appraisal.technical?.administration || "Intermediate",
      presentationSkills: appraisal.technical?.presentationSkills || "Intermediate",
      qualityOfWork: appraisal.technical?.qualityOfWork || "Intermediate",
      efficiency: appraisal.technical?.efficiency || "Intermediate",
      integrity: appraisal.organizational?.integrity || "Intermediate",
      professionalism: appraisal.organizational?.professionalism || "Intermediate",
      teamWork: appraisal.organizational?.teamWork || "Intermediate",
      criticalThinking: appraisal.organizational?.criticalThinking || "Intermediate",
      conflictManagement: appraisal.organizational?.conflictManagement || "Intermediate",
      attendance: appraisal.organizational?.attendance || "Intermediate",
      abilityToMeetDeadline: appraisal.organizational?.abilityToMeetDeadline || "Intermediate",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenPassport = (appraisal: any) => {
    setSelectedAppraisal(appraisal);
    setIsPassportModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!appraisalsList.length) {
      toast.error("No appraisal records to export.");
      return;
    }
    const headers = ["Employee", "Designation", "Department", "Appraisal Date", "Rating Score", "Status"];
    const rows = appraisalsList.map((a) => [
      `"${a.employee?.firstName || ""} ${a.employee?.lastName || ""}"`,
      `"${a.employee?.position || ""}"`,
      `"${a.employee?.department || ""}"`,
      `"${new Date(a.appraisalDate).toLocaleDateString()}"`,
      `"${a.ratingScore}"`,
      `"${a.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `performance_appraisals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported performance appraisals to CSV.");
  };

  if (!isEntitled) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Appraisal</h1>
            <p className="text-sm text-muted-foreground">Periodic Employee Competency Assessments & Scorecards</p>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <Target className="h-12 w-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-bold">OKR & Performance Add-On Required</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Conduct rigorous employee evaluations, calculate scorecards across technical and organizational pillars, and establish promotion roadmaps.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={() => startTrial()} disabled={isStartingTrial} className="bg-amber-600 hover:bg-amber-700">
                Start 14-Day Free Trial
              </Button>
              <Button variant="outline" onClick={() => subscribe("pro_annual")} disabled={isSubscribing}>
                Subscribe to Module
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/okr" className="hover:text-foreground">Performance</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Performance Appraisal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Appraisal</h1>
          <p className="text-xs text-muted-foreground">
            Execute periodic performance evaluations, track employee ratings, and generate appraisal scorecards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormData(initialForm);
              setIsAddModalOpen(true);
            }}
            className="gap-2 text-xs bg-primary hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Appraisal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Appraisals</p>
              <h3 className="text-2xl font-bold mt-1">{totalAppraisals}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recorded assessments</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Assessments</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{activeAppraisals}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">Enforced evaluations</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Average Rating</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-500 flex items-center gap-1.5">
                {averageScore}
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Out of 5.0 scale</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Top Performers</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">{topPerformers}</h3>
              <p className="text-[11px] text-purple-600 mt-0.5">Score ≥ 4.5</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {Array.isArray(departmentsData) &&
                  departmentsData.map((d: any) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || selectedDepartment !== "all" || selectedStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDepartment("all");
                  setSelectedStatus("all");
                }}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold">Designation</TableHead>
                <TableHead className="text-xs font-semibold">Department</TableHead>
                <TableHead className="text-xs font-semibold">Appraisal Date</TableHead>
                <TableHead className="text-xs font-semibold">Rating Score</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    Loading appraisal records...
                  </TableCell>
                </TableRow>
              ) : appraisalsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No performance appraisals found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                appraisalsList.map((app) => (
                  <TableRow key={app.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={app.employee?.avatar} />
                          <AvatarFallback className="text-xs bg-muted">
                            {app.employee?.firstName?.[0]}
                            {app.employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">
                            {app.employee?.firstName} {app.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.employee?.employeeNumber || "EMP-001"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground">
                      {app.employee?.position || "Specialist"}
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[11px] font-normal border-border/80">
                        {app.employee?.department || "General"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(app.appraisalDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold gap-1"
                        >
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {Number(app.ratingScore).toFixed(1)}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge
                        variant="secondary"
                        className={
                          app.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]"
                            : "bg-muted text-muted-foreground text-[10px]"
                        }
                      >
                        {app.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to="/performance-review"
                          search={{ id: app.id }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Open Full Scorecard Sheet"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenPassport(app)}
                          title="View Passport"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(app)}
                          title="Edit Appraisal"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remove appraisal for ${app.employee?.firstName} ${app.employee?.lastName}?`)) {
                              deleteMutation.mutate(app.id);
                            }
                          }}
                          title="Delete Appraisal"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add Appraisal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Performance Appraisal</DialogTitle>
            <DialogDescription>
              Evaluate employee against organizational and technical competency pillars.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(employeesData) &&
                      employeesData.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || "Employee"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Appraisal Date *</Label>
                <Input
                  type="date"
                  value={formData.appraisalDate}
                  onChange={(e) => setFormData({ ...formData, appraisalDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Rating Score (1.0 to 5.0)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.ratingScore}
                  onChange={(e) => setFormData({ ...formData, ratingScore: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Evaluator Remarks & Recommendations</Label>
              <Textarea
                placeholder="Key accomplishments, growth trajectory, areas for developmental focus..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Technical Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Technical Competencies Assessment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TECHNICAL_COMPETENCIES.map((comp) => (
                  <div key={comp.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{comp.label}</span>
                    <Select
                      value={(formData as any)[comp.key]}
                      onValueChange={(val) => setFormData({ ...formData, [comp.key]: val })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Organizational Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Organizational Competencies Assessment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ORGANIZATIONAL_COMPETENCIES.map((comp) => (
                  <div key={comp.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{comp.label}</span>
                    <Select
                      value={(formData as any)[comp.key]}
                      onValueChange={(val) => setFormData({ ...formData, [comp.key]: val })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => {
                if (!formData.employeeId || !formData.appraisalDate) {
                  toast.error("Please select an employee and appraisal date.");
                  return;
                }
                createMutation.mutate(formData);
              }}
            >
              {createMutation.isPending ? "Submitting..." : "Save Appraisal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appraisal Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Performance Appraisal</DialogTitle>
            <DialogDescription>Modify evaluation scores and remarks.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(employeesData) &&
                      employeesData.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || "Employee"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Appraisal Date *</Label>
                <Input
                  type="date"
                  value={formData.appraisalDate}
                  onChange={(e) => setFormData({ ...formData, appraisalDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Rating Score (1.0 to 5.0)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.ratingScore}
                  onChange={(e) => setFormData({ ...formData, ratingScore: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Technical Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Technical Competencies Assessment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TECHNICAL_COMPETENCIES.map((comp) => (
                  <div key={comp.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{comp.label}</span>
                    <Select
                      value={(formData as any)[comp.key]}
                      onValueChange={(val) => setFormData({ ...formData, [comp.key]: val })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Organizational Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Organizational Competencies Assessment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ORGANIZATIONAL_COMPETENCIES.map((comp) => (
                  <div key={comp.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{comp.label}</span>
                    <Select
                      value={(formData as any)[comp.key]}
                      onValueChange={(val) => setFormData({ ...formData, [comp.key]: val })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!selectedAppraisal?.id) return;
                updateMutation.mutate({ id: selectedAppraisal.id, payload: formData });
              }}
            >
              {updateMutation.isPending ? "Updating..." : "Update Appraisal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appraisal Passport Modal */}
      <Dialog open={isPassportModalOpen} onOpenChange={setIsPassportModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedAppraisal && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={selectedAppraisal.employee?.avatar} />
                      <AvatarFallback className="text-xs bg-muted font-bold">
                        {selectedAppraisal.employee?.firstName?.[0]}
                        {selectedAppraisal.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-base font-bold">
                        {selectedAppraisal.employee?.firstName} {selectedAppraisal.employee?.lastName}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {selectedAppraisal.employee?.position || "Employee"} •{" "}
                        {selectedAppraisal.employee?.department || "General"}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold gap-1"
                    >
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {Number(selectedAppraisal.ratingScore).toFixed(1)} / 5.0
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* Meta details */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Employee ID</span>
                    <span className="font-semibold text-foreground">
                      {selectedAppraisal.employee?.employeeNumber || "EMP-001"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Appraisal Date</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedAppraisal.appraisalDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Evaluation Status</span>
                    <Badge
                      variant="secondary"
                      className={
                        selectedAppraisal.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }
                    >
                      {selectedAppraisal.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {/* Remarks */}
                {selectedAppraisal.remarks && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                    <span className="font-semibold text-foreground block mb-1">Evaluator Remarks:</span>
                    <p className="text-muted-foreground">{selectedAppraisal.remarks}</p>
                  </div>
                )}

                {/* Technical Competencies list */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Assessed Technical Competencies
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {TECHNICAL_COMPETENCIES.map((comp) => {
                      const val = selectedAppraisal.technical?.[comp.key] || "Intermediate";
                      return (
                        <div
                          key={comp.key}
                          className="flex items-center justify-between p-2 rounded border border-border/40 bg-card"
                        >
                          <span className="text-foreground">{comp.label}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {val}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Organizational Competencies list */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Assessed Organizational Competencies
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ORGANIZATIONAL_COMPETENCIES.map((comp) => {
                      const val = selectedAppraisal.organizational?.[comp.key] || "Intermediate";
                      return (
                        <div
                          key={comp.key}
                          className="flex items-center justify-between p-2 rounded border border-border/40 bg-card"
                        >
                          <span className="text-foreground">{comp.label}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {val}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <Link
                  to="/performance-review"
                  search={{ id: selectedAppraisal.id }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Full Scorecard Sheet
                </Link>
                <Button size="sm" onClick={() => setIsPassportModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
