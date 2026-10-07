import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  XCircle,
  Copy,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/job-postings")({
  component: HrJobPostingsPage,
});

export default function HrJobPostingsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    jobCode: "",
    department: "Engineering",
    designation: "Software Engineer",
    location: "Bangalore HQ",
    type: "FULL_TIME",
    openings: 2,
    minSalary: 800000,
    maxSalary: 1500000,
    skills: "React, TypeScript, Node.js",
    description: "We are seeking a talented engineer to join our core team.",
    requirements: "3+ years of relevant experience in modern web stacks.",
  });

  // Queries
  const { data: jobList = [], isLoading } = useQuery({
    queryKey: ["hr-job-postings", statusFilter],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; jobs?: any[] }>(
        `/hr/recruitment/job-postings${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
      );
      return Array.isArray(res) ? res : res.data || res.jobs || [];
    },
  });

  const { data: funnelStats } = useQuery({
    queryKey: ["hr-recruitment-funnel"],
    queryFn: async () => {
      return await api.get<any>("/hr/recruitment/funnel");
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/job-postings", payload);
    },
    onSuccess: () => {
      toast.success("Job posting created in DRAFT status");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create job posting");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/recruitment/job-postings/${id}/approve`, {});
    },
    onSuccess: () => {
      toast.success("Job posting approved and ready to publish");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Approval failed");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/recruitment/job-postings/${id}/publish`, {
        channels: ["CAREERS_SITE", "INTERNAL_BOARD"],
      });
    },
    onSuccess: () => {
      toast.success("Job posting published to Careers site and Internal Board");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Publishing failed");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/hr/recruitment/job-postings/${id}/close`, { reason });
    },
    onSuccess: () => {
      toast.success("Job posting marked as closed");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to close job");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      jobCode: "",
      department: "Engineering",
      designation: "Software Engineer",
      location: "Bangalore HQ",
      type: "FULL_TIME",
      openings: 2,
      minSalary: 800000,
      maxSalary: 1500000,
      skills: "React, TypeScript, Node.js",
      description: "We are seeking a talented engineer to join our core team.",
      requirements: "3+ years of relevant experience in modern web stacks.",
    });
  };

  const filteredJobs = jobList.filter((j: any) => {
    const q = searchQuery.toLowerCase();
    const matchesQ =
      !q ||
      j.title?.toLowerCase().includes(q) ||
      j.jobCode?.toLowerCase().includes(q) ||
      j.department?.toLowerCase().includes(q);
    return matchesQ;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "published":
      case "open":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Published</Badge>;
      case "pending_approval":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending Approval</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "filled":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Filled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Job Postings Management"
          description="Authoritative lifecycle from draft requisitions and headcount checks to approved postings and multi-channel publication."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Requisition
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Openings"
          value={jobList.filter((j: any) => j.status === "published" || j.status === "open").length.toString()}
          description="Published to careers portal"
          icon={<Briefcase className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Pending Approvals"
          value={jobList.filter((j: any) => j.status === "pending_approval").length.toString()}
          description="Awaiting headcount sign-off"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Total Requisitions"
          value={jobList.length.toString()}
          description="All lifecycle phases"
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Candidates"
          value={funnelStats?.funnel?.applied || "--"}
          description="Total pipeline applicants"
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search by job title, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published / Open</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing <strong>{filteredJobs.length}</strong> postings
          </div>
        </CardContent>
      </Card>

      {/* Postings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Requisitions & Job Openings</CardTitle>
          <CardDescription>
            Each posting validates department headcount budget before transition from draft to published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code & Title</TableHead>
                <TableHead>Department / Location</TableHead>
                <TableHead>Openings</TableHead>
                <TableHead>Compensation Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No job postings found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job: any) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {job.jobCode || job.id.substring(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{job.department || "General"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location || "Remote / Hybrid"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{job.openings || 1}</span> slots
                    </TableCell>
                    <TableCell className="text-sm">
                      ₹{(Number(job.minSalary) / 100000 || 8).toFixed(1)}L - ₹
                      {(Number(job.maxSalary) / 100000 || 15).toFixed(1)}L
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {job.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(job.id)}
                          className="gap-1 text-xs"
                        >
                          <Send className="h-3 w-3" /> Submit for Approval
                        </Button>
                      )}
                      {job.status === "pending_approval" && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(job.id)}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {job.status === "pending_approval" || job.status === "draft" ? (
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate(job.id)}
                          className="gap-1 text-xs bg-primary text-primary-foreground"
                        >
                          <Eye className="h-3 w-3" /> Publish
                        </Button>
                      ) : null}
                      {job.status === "published" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => closeMutation.mutate({ id: job.id, reason: "Position filled" })}
                          className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-3 w-3" /> Close
                        </Button>
                      )}
                      <Link
                        to="/hr/recruitment/candidates"
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-2.5"
                      >
                        Applicants
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job Requisition</DialogTitle>
            <DialogDescription>
              New requisitions start as DRAFT and require headcount verification before publishing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g. Senior Backend Engineer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job Code</Label>
              <Input
                placeholder="e.g. ENG-2026-04"
                value={formData.jobCode}
                onChange={(e) => setFormData({ ...formData, jobCode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location / Branch</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Approved Openings</Label>
              <Input
                type="number"
                min="1"
                value={formData.openings}
                onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Min Salary (Annual ₹)</Label>
              <Input
                type="number"
                value={formData.minSalary}
                onChange={(e) => setFormData({ ...formData, minSalary: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Salary (Annual ₹)</Label>
              <Input
                type="number"
                value={formData.maxSalary}
                onChange={(e) => setFormData({ ...formData, maxSalary: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Required Skills (comma separated)</Label>
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Job Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Requirements & Qualifications</Label>
              <Textarea
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Creating..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
