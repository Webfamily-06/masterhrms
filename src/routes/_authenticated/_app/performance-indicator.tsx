import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAddon } from "@/hooks/use-addon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sliders,
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
  Award,
  Layers,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/performance-indicator")({
  component: PerformanceIndicatorPage,
  head: () => ({
    meta: [{ title: "Performance Indicator — Master HRMS" }],
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

export function PerformanceIndicatorPage() {
  const queryClient = useQueryClient();
  const { isEntitled, isTrial, trialDaysLeft, startTrial, isStartingTrial, subscribe, isSubscribing } =
    useAddon("okr-performance");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);

  // Form state
  const initialForm = {
    designationName: "",
    departmentName: "",
    approvedById: "",
    status: "active",
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
  const { data: indicatorsData, isLoading, refetch } = useQuery({
    queryKey: ["performance-indicators", selectedDepartment, selectedStatus, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedDepartment && selectedDepartment !== "all") params.append("department", selectedDepartment);
        if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        const res = await api.get(`/addons/okr/indicators?${params.toString()}`);
        return res?.indicators || [];
      } catch (err: any) {
        toast.error("Failed to load performance indicators: " + err.message);
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof initialForm) => {
      return await api.post("/addons/okr/indicators", payload);
    },
    onSuccess: () => {
      toast.success("Performance Indicator established successfully!");
      setIsAddModalOpen(false);
      setFormData(initialForm);
      queryClient.invalidateQueries({ queryKey: ["performance-indicators"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create indicator.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof initialForm }) => {
      return await api.put(`/addons/okr/indicators/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Performance Indicator updated successfully!");
      setIsEditModalOpen(false);
      setSelectedIndicator(null);
      queryClient.invalidateQueries({ queryKey: ["performance-indicators"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update indicator.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/addons/okr/indicators/${id}`);
    },
    onSuccess: () => {
      toast.success("Indicator removed successfully.");
      queryClient.invalidateQueries({ queryKey: ["performance-indicators"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete indicator.");
    },
  });

  const indicatorsList: any[] = indicatorsData || [];

  // Metrics
  const totalIndicators = indicatorsList.length;
  const activeIndicators = indicatorsList.filter((i) => i.status === "active").length;
  const departmentsCovered = new Set(indicatorsList.map((i) => i.departmentName)).size;
  const approvedCount = indicatorsList.filter((i) => i.approvedBy).length;

  const handleOpenEdit = (indicator: any) => {
    setSelectedIndicator(indicator);
    setFormData({
      designationName: indicator.designationName || "",
      departmentName: indicator.departmentName || "",
      approvedById: indicator.approvedBy?.id || "",
      status: indicator.status || "active",
      customerExperience: indicator.technical?.customerExperience || "Intermediate",
      marketing: indicator.technical?.marketing || "Intermediate",
      management: indicator.technical?.management || "Intermediate",
      administration: indicator.technical?.administration || "Intermediate",
      presentationSkills: indicator.technical?.presentationSkills || "Intermediate",
      qualityOfWork: indicator.technical?.qualityOfWork || "Intermediate",
      efficiency: indicator.technical?.efficiency || "Intermediate",
      integrity: indicator.organizational?.integrity || "Intermediate",
      professionalism: indicator.organizational?.professionalism || "Intermediate",
      teamWork: indicator.organizational?.teamWork || "Intermediate",
      criticalThinking: indicator.organizational?.criticalThinking || "Intermediate",
      conflictManagement: indicator.organizational?.conflictManagement || "Intermediate",
      attendance: indicator.organizational?.attendance || "Intermediate",
      abilityToMeetDeadline: indicator.organizational?.abilityToMeetDeadline || "Intermediate",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenPassport = (indicator: any) => {
    setSelectedIndicator(indicator);
    setIsPassportModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!indicatorsList.length) {
      toast.error("No indicators to export.");
      return;
    }
    const headers = ["Designation", "Department", "Approved By", "Status", "Created Date"];
    const rows = indicatorsList.map((i) => [
      `"${i.designationName || ""}"`,
      `"${i.departmentName || ""}"`,
      `"${i.approvedBy ? `${i.approvedBy.firstName} ${i.approvedBy.lastName}` : "Pending"}"`,
      `"${i.status}"`,
      `"${new Date(i.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `performance_indicators_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported performance indicators to CSV.");
  };

  if (!isEntitled) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Indicators</h1>
            <p className="text-sm text-muted-foreground">Standardized Role Competency KPIs & Organizational Benchmarks</p>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <Target className="h-12 w-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-bold">OKR & Performance Add-On Required</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Define comprehensive technical and organizational competency indicators for every designation across departments to align evaluation criteria.
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
            <span className="text-foreground font-medium">Performance Indicator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Indicator</h1>
          <p className="text-xs text-muted-foreground">
            Manage organizational and technical competency benchmarks across departments and designations
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
            Add Indicator
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Indicators</p>
              <h3 className="text-2xl font-bold mt-1">{totalIndicators}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Configured roles</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Roles</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{activeIndicators}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">Enforced in appraisals</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Departments Covered</p>
              <h3 className="text-2xl font-bold mt-1">{departmentsCovered}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Organizational units</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Executive Approvals</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">{approvedCount}</h3>
              <p className="text-[11px] text-purple-600 mt-0.5">HOD certified</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
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
              placeholder="Search designation, department..."
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
                <TableHead className="text-xs font-semibold">Designation</TableHead>
                <TableHead className="text-xs font-semibold">Department</TableHead>
                <TableHead className="text-xs font-semibold">Approved By</TableHead>
                <TableHead className="text-xs font-semibold">Created Date</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Loading indicators...
                  </TableCell>
                </TableRow>
              ) : indicatorsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No performance indicators found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                indicatorsList.map((ind) => (
                  <TableRow key={ind.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{ind.designationName}</div>
                          <div className="text-[11px] text-muted-foreground">7 Tech & 7 Org Competencies</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[11px] font-normal border-border/80">
                        {ind.departmentName}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs">
                      {ind.approvedBy ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={ind.approvedBy.avatar} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {ind.approvedBy.firstName?.[0]}
                              {ind.approvedBy.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {ind.approvedBy.firstName} {ind.approvedBy.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {ind.approvedBy.position || "Head of Department"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Pending Review</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(ind.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge
                        variant="secondary"
                        className={
                          ind.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]"
                            : "bg-muted text-muted-foreground text-[10px]"
                        }
                      >
                        {ind.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenPassport(ind)}
                          title="View Competencies"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(ind)}
                          title="Edit Indicator"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remove performance indicator for ${ind.designationName}?`)) {
                              deleteMutation.mutate(ind.id);
                            }
                          }}
                          title="Delete Indicator"
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

      {/* Add Indicator Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Performance Indicator</DialogTitle>
            <DialogDescription>
              Define required technical and organizational benchmarks for this designation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Designation *</Label>
                <Input
                  placeholder="e.g. Senior Software Engineer"
                  value={formData.designationName}
                  onChange={(e) => setFormData({ ...formData, designationName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Department *</Label>
                <Input
                  placeholder="e.g. Engineering"
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Approved By (Evaluator)</Label>
                <Select
                  value={formData.approvedById}
                  onValueChange={(val) => setFormData({ ...formData, approvedById: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Evaluator" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(employeesData) &&
                      employeesData.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Technical Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Technical Competencies
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
                Organizational Competencies
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
                if (!formData.designationName || !formData.departmentName) {
                  toast.error("Please enter designation and department.");
                  return;
                }
                createMutation.mutate(formData);
              }}
            >
              {createMutation.isPending ? "Saving..." : "Save Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Indicator Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Performance Indicator</DialogTitle>
            <DialogDescription>Update benchmarks and competencies for this role.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Designation *</Label>
                <Input
                  value={formData.designationName}
                  onChange={(e) => setFormData({ ...formData, designationName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Department *</Label>
                <Input
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Approved By</Label>
                <Select
                  value={formData.approvedById}
                  onValueChange={(val) => setFormData({ ...formData, approvedById: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Evaluator" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(employeesData) &&
                      employeesData.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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

            {/* Technical Competencies */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b pb-1 text-xs font-semibold text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Technical Competencies
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
                Organizational Competencies
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
                if (!selectedIndicator?.id) return;
                updateMutation.mutate({ id: selectedIndicator.id, payload: formData });
              }}
            >
              {updateMutation.isPending ? "Updating..." : "Update Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indicator Passport Modal */}
      <Dialog open={isPassportModalOpen} onOpenChange={setIsPassportModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedIndicator && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold">
                        {selectedIndicator.designationName}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {selectedIndicator.departmentName} Department
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      selectedIndicator.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {selectedIndicator.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* Approval card */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Certified By: </span>
                    <span className="font-semibold text-foreground">
                      {selectedIndicator.approvedBy
                        ? `${selectedIndicator.approvedBy.firstName} ${selectedIndicator.approvedBy.lastName} (${selectedIndicator.approvedBy.position})`
                        : "Pending Approval"}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Created: {new Date(selectedIndicator.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Technical Competencies list */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Technical Competencies (Expected Benchmarks)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {TECHNICAL_COMPETENCIES.map((comp) => {
                      const val = selectedIndicator.technical?.[comp.key] || "Intermediate";
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
                    Organizational Competencies (Culture & Values)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ORGANIZATIONAL_COMPETENCIES.map((comp) => {
                      const val = selectedIndicator.organizational?.[comp.key] || "Intermediate";
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

              <DialogFooter>
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
