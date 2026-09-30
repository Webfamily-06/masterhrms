import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  ChevronRight,
  FileText,
  Printer,
  FileCheck,
  ShieldCheck,
  LayoutGrid,
  List,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/warnings")({
  component: WarningsPage,
  head: () => ({ meta: [{ title: "Disciplinary Warnings — Master HRMS" }] }),
});

export function WarningsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const userRoles = profile?.roles || [];
  const canManageWarnings = userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"table" | "grid">("table");

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [viewNoticeWarning, setViewNoticeWarning] = useState<any | null>(null);
  const [acknowledgeWarning, setAcknowledgeWarning] = useState<any | null>(null);
  const [employeeResponseText, setEmployeeResponseText] = useState("");

  // Create Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formWarningTypeId, setFormAwardTypeId] = useState("");
  const [formSeverity, setFormSeverity] = useState("moderate");
  const [formWarningDate, setFormWarningDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formWarningBy, setFormWarningBy] = useState("");

  // New Type State
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeSeverity, setNewTypeSeverity] = useState("moderate");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  // Fetch Warnings
  const { data: warningsData, isLoading: warningsLoading } = useQuery({
    queryKey: ["warnings", severityFilter, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      return await api.get(`/api/warnings?${params.toString()}`);
    },
  });

  const warnings: any[] = useMemo(() => {
    if (Array.isArray(warningsData)) return warningsData;
    return warningsData?.data || [];
  }, [warningsData]);

  const stats = warningsData?.stats || {
    totalWarnings: warnings.length,
    activeCount: warnings.filter((w) => w.status === "issued").length,
    criticalCount: warnings.filter((w) => w.severity === "critical").length,
  };

  // Fetch Warning Types
  const { data: warningTypes = [] } = useQuery<any[]>({
    queryKey: ["warning-types"],
    queryFn: async () => {
      const res = await api.get("/api/warnings/types");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Fetch Employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-light"],
    queryFn: async () => {
      const res = await api.get("/api/employees?limit=200");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const employees: any[] = employeesData || [];

  // Create Warning Mutation
  const createWarningMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/warnings", payload);
    },
    onSuccess: () => {
      toast.success("Disciplinary warning issued successfully.");
      setIsCreateModalOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["warnings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to issue warning.");
    },
  });

  // Create Warning Type Mutation
  const createTypeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/warnings/types", payload);
    },
    onSuccess: () => {
      toast.success("Warning infraction type added!");
      setIsTypeModalOpen(false);
      setNewTypeName("");
      setNewTypeDescription("");
      qc.invalidateQueries({ queryKey: ["warning-types"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create category.");
    },
  });

  // Acknowledge Warning Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ id, employeeResponse }: { id: string; employeeResponse: string }) => {
      return await api.post(`/api/warnings/${id}/acknowledge`, { employeeResponse });
    },
    onSuccess: () => {
      toast.success("Warning acknowledged and recorded.");
      setAcknowledgeWarning(null);
      setEmployeeResponseText("");
      qc.invalidateQueries({ queryKey: ["warnings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to acknowledge warning.");
    },
  });

  // Resolve Warning Mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/api/warnings/${id}/resolve`);
    },
    onSuccess: () => {
      toast.success("Incident resolved and closed.");
      qc.invalidateQueries({ queryKey: ["warnings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to resolve incident.");
    },
  });

  // Delete Warning Mutation
  const deleteWarningMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/warnings/${id}`);
    },
    onSuccess: () => {
      toast.success("Warning record deleted.");
      qc.invalidateQueries({ queryKey: ["warnings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete warning.");
    },
  });

  const resetForm = () => {
    setFormEmployeeId("");
    setFormAwardTypeId("");
    setFormSeverity("moderate");
    setFormWarningDate(new Date().toISOString().split("T")[0]);
    setFormSubject("");
    setFormDescription("");
    setFormWarningBy("");
  };

  const handleIssueWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formSubject.trim() || !formDescription.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createWarningMutation.mutate({
      employeeId: formEmployeeId,
      warningTypeId: formWarningTypeId || null,
      severity: formSeverity,
      warningDate: formWarningDate,
      subject: formSubject.trim(),
      description: formDescription.trim(),
      warningBy: formWarningBy.trim(),
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast.error("Infraction type name is required.");
      return;
    }
    createTypeMutation.mutate({
      name: newTypeName.trim(),
      defaultSeverity: newTypeSeverity,
      description: newTypeDescription.trim(),
    });
  };

  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchSearch =
        !searchTerm ||
        w.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${w.employee?.firstName} ${w.employee?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchSeverity = severityFilter === "all" || w.severity === severityFilter;
      const matchStatus = statusFilter === "all" || w.status === statusFilter;
      return matchSearch && matchSeverity && matchStatus;
    });
  }, [warnings, searchTerm, severityFilter, statusFilter]);

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Critical</Badge>;
      case "major":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Major</Badge>;
      case "moderate":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Moderate</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Minor</Badge>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case "resolved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Resolved</Badge>;
      case "acknowledged":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Acknowledged</Badge>;
      case "appealed":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Appealed</Badge>;
      default:
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">Active Notice</Badge>;
    }
  };

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm" className="hover:text-foreground transition-colors">
              HRM
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Disciplinary Warnings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
            Disciplinary Warnings & Incidents
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track workplace policy notices, infractions, formal letters, and employee acknowledgment records.
          </p>
        </div>

        {canManageWarnings && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTypeModalOpen(true)}
              className="h-9 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Infraction Type
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Issue Warning
            </Button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-rose-500/5 to-transparent">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Warnings Logged</CardTitle>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">{stats.totalWarnings || warnings.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Historical and active formal notices
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Pending Acknowledgment</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">{stats.activeCount || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting employee signature sign-off
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Critical Infractions</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">{stats.criticalCount || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Major violations requiring executive review
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Resolved / Remediated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              {warnings.filter((w) => w.status === "resolved").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Successfully corrected behaviors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search subject, employee, details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Severities</SelectItem>
                  <SelectItem value="minor" className="text-xs">Minor</SelectItem>
                  <SelectItem value="moderate" className="text-xs">Moderate</SelectItem>
                  <SelectItem value="major" className="text-xs">Major</SelectItem>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="issued" className="text-xs">Active Notice</SelectItem>
                  <SelectItem value="acknowledged" className="text-xs">Acknowledged</SelectItem>
                  <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
                <Button
                  variant={activeTab === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("table")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <List className="h-3.5 w-3.5" />
                  Table
                </Button>
                <Button
                  variant={activeTab === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("grid")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings Content */}
      {warningsLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
          Loading disciplinary incident records...
        </div>
      ) : filteredWarnings.length === 0 ? (
        <Card className="border border-dashed border-border/80 text-center py-12">
          <CardContent className="space-y-3">
            <ShieldCheck className="h-10 w-10 text-emerald-500/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No disciplinary warnings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no active disciplinary actions matching the selected filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : activeTab === "table" ? (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Employee</TableHead>
                <TableHead className="text-xs font-semibold">Infraction Subject</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Severity</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Issued By</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarnings.map((warning) => (
                <TableRow key={warning.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-bold">
                          {warning.employee?.firstName?.[0]}
                          {warning.employee?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {warning.employee?.firstName} {warning.employee?.lastName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {warning.employee?.employeeCode} • {warning.employee?.department?.name || "General"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-foreground line-clamp-1">{warning.subject}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 italic">{warning.description}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {warning.warningType?.name || "General Violation"}
                  </TableCell>
                  <TableCell>{getSeverityBadge(warning.severity)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(warning.warningDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {warning.warningBy || "HR Dept"}
                  </TableCell>
                  <TableCell>{getStatusBadge(warning.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewNoticeWarning(warning)}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Notice
                      </Button>

                      {warning.status === "issued" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAcknowledgeWarning(warning);
                            setEmployeeResponseText("");
                          }}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 px-2"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Sign Off
                        </Button>
                      )}

                      {canManageWarnings && warning.status !== "resolved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Mark this incident as resolved and closed?")) {
                              resolveMutation.mutate(warning.id);
                            }
                          }}
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 px-2"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                      )}

                      {canManageWarnings && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this warning record?")) {
                              deleteWarningMutation.mutate(warning.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarnings.map((warning) => (
            <Card
              key={warning.id}
              className="border border-border/70 hover:border-rose-500/40 transition-all hover:shadow-md relative overflow-hidden bg-card"
            >
              <div
                className={cn(
                  "h-1.5 w-full",
                  warning.severity === "critical"
                    ? "bg-red-500"
                    : warning.severity === "major"
                    ? "bg-orange-500"
                    : warning.severity === "moderate"
                    ? "bg-amber-500"
                    : "bg-blue-500"
                )}
              />
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs font-bold">
                        {warning.employee?.firstName?.[0]}
                        {warning.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {warning.employee?.firstName} {warning.employee?.lastName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {warning.employee?.position || "Staff"} • {warning.employee?.department?.name || "General"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getSeverityBadge(warning.severity)}
                    {getStatusBadge(warning.status)}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">{warning.warningType?.name || "Violation"}</span>
                    <span>{new Date(warning.warningDate).toLocaleDateString()}</span>
                  </div>
                  <h5 className="font-bold text-foreground text-xs">{warning.subject}</h5>
                  <p className="text-[11px] text-muted-foreground line-clamp-3 italic">
                    "{warning.description}"
                  </p>
                </div>

                {warning.acknowledgedAt && (
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                    <p className="font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Employee Acknowledged
                    </p>
                    {warning.employeeResponse && (
                      <p className="italic text-[10px] mt-0.5">"{warning.employeeResponse}"</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                  <span className="text-[10px] text-muted-foreground">
                    By: <strong className="text-foreground">{warning.warningBy || "HR Dept"}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewNoticeWarning(warning)}
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Notice
                    </Button>
                    {warning.status === "issued" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAcknowledgeWarning(warning);
                          setEmployeeResponseText("");
                        }}
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 px-2"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Sign
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Issue Disciplinary Warning */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Issue Disciplinary Warning Notice
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log a formal infraction notice and dispatch an acknowledgment request.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleIssueWarning} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Employee Recipient *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.firstName} {e.lastName} ({e.employeeCode}) • {e.department?.name || "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Infraction Category</Label>
                <Select value={formWarningTypeId} onValueChange={setFormAwardTypeId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {warningTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Severity Tier *</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor" className="text-xs">Minor (First Notice)</SelectItem>
                    <SelectItem value="moderate" className="text-xs">Moderate (Written Notice)</SelectItem>
                    <SelectItem value="major" className="text-xs">Major (Final Notice)</SelectItem>
                    <SelectItem value="critical" className="text-xs">Critical (Suspension / Escalation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Incident Date *</Label>
                <Input
                  type="date"
                  value={formWarningDate}
                  onChange={(e) => setFormWarningDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Issued By</Label>
                <Input
                  value={formWarningBy}
                  onChange={(e) => setFormWarningBy(e.target.value)}
                  placeholder="HR Dept / Manager"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notice Subject *</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. Unscheduled Absences in Q3, Workplace Conduct Violation"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Infraction Description & Required Remediation *</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Factual description of the incident, relevant policy clauses, and corrective milestones expected..."
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createWarningMutation.isPending}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {createWarningMutation.isPending ? "Issuing..." : "Issue Formal Warning"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Custom Infraction Category */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-amber-500" />
              Add Infraction Category
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new category of policy infraction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateType} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Name *</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Remote Work Violation, IT Equipment Misuse"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Default Severity</Label>
              <Select value={newTypeSeverity} onValueChange={setNewTypeSeverity}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor" className="text-xs">Minor</SelectItem>
                  <SelectItem value="moderate" className="text-xs">Moderate</SelectItem>
                  <SelectItem value="major" className="text-xs">Major</SelectItem>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Organizational guidelines covering this infraction..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTypeModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createTypeMutation.isPending} className="h-8 text-xs">
                {createTypeMutation.isPending ? "Saving..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Formal Warning Notice Document View */}
      <Dialog open={!!viewNoticeWarning} onOpenChange={(open) => !open && setViewNoticeWarning(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 p-6 sm:p-8">
          {viewNoticeWarning && (
            <div className="space-y-6">
              <div className="border border-border rounded-xl p-6 sm:p-8 bg-card space-y-5 text-left">
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-rose-500" />
                      FORMAL DISCIPLINARY NOTICE
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      Ref: WRN-{new Date(viewNoticeWarning.warningDate).getFullYear()}-{viewNoticeWarning.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getSeverityBadge(viewNoticeWarning.severity)}
                    {getStatusBadge(viewNoticeWarning.status)}
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 p-3 rounded-lg">
                  <div>
                    <p className="text-muted-foreground">To Employee:</p>
                    <p className="font-bold text-foreground text-sm">
                      {viewNoticeWarning.employee?.firstName} {viewNoticeWarning.employee?.lastName}
                    </p>
                    <p className="text-muted-foreground">
                      ID: {viewNoticeWarning.employee?.employeeCode} • {viewNoticeWarning.employee?.position || "Staff"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Issued By:</p>
                    <p className="font-bold text-foreground text-sm">{viewNoticeWarning.warningBy || "Human Resources"}</p>
                    <p className="text-muted-foreground">
                      Date: {new Date(viewNoticeWarning.warningDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Subject & Description */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Subject: {viewNoticeWarning.subject}
                  </h4>
                  <div className="rounded border bg-background/50 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {viewNoticeWarning.description}
                  </div>
                </div>

                {/* Policy Warning statement */}
                <div className="text-[11px] text-muted-foreground bg-rose-500/5 border border-rose-500/20 rounded p-3 space-y-1">
                  <p className="font-bold text-rose-600 dark:text-rose-400">Notice of Consequence:</p>
                  <p>
                    This document serves as an official formal record in your personnel file. Continued or repeated infractions of this nature may result in progressive disciplinary action up to and including termination of employment.
                  </p>
                </div>

                {/* Acknowledgment Stamp */}
                <div className="pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">Employee Sign-Off Status:</p>
                    {viewNoticeWarning.acknowledgedAt ? (
                      <p className="text-emerald-600 flex items-center gap-1 font-medium mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Signed & Acknowledged on {new Date(viewNoticeWarning.acknowledgedAt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-amber-600 flex items-center gap-1 font-medium mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        Awaiting Employee Signature Acknowledgment
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs gap-1.5">
                      <Printer className="h-3.5 w-3.5" />
                      Print Notice
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 4: Employee Acknowledgment Sign-off */}
      <Dialog open={!!acknowledgeWarning} onOpenChange={(open) => !open && setAcknowledgeWarning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-500" />
              Sign Off & Acknowledge Warning Notice
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm your receipt of this notice and submit any formal employee response comments.
            </DialogDescription>
          </DialogHeader>

          {acknowledgeWarning && (
            <div className="space-y-4 py-2">
              <div className="rounded bg-muted/40 p-3 text-xs space-y-1">
                <p className="text-muted-foreground">Subject:</p>
                <p className="font-bold text-foreground">{acknowledgeWarning.subject}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Issued on {new Date(acknowledgeWarning.warningDate).toLocaleDateString()} by {acknowledgeWarning.warningBy}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Employee Statement / Response (Optional)</Label>
                <Textarea
                  value={employeeResponseText}
                  onChange={(e) => setEmployeeResponseText(e.target.value)}
                  placeholder="Provide any context, agreement, or remediation commitment you wish to place on record..."
                  className="text-xs min-h-[80px]"
                />
                <p className="text-[10px] text-muted-foreground">
                  By clicking "Confirm Acknowledgment", you confirm that you have read and understood this notice.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAcknowledgeWarning(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => {
                    acknowledgeMutation.mutate({
                      id: acknowledgeWarning.id,
                      employeeResponse: employeeResponseText,
                    });
                  }}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {acknowledgeMutation.isPending ? "Recording..." : "Confirm Acknowledgment"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
