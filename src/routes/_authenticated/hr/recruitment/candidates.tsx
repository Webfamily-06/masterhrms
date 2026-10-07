import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Award,
  Video,
  FileText,
  Mail,
  Phone,
  Briefcase,
  GitMerge,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/candidates")({
  component: HrCandidatesPage,
});

export default function HrCandidatesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<any>(null);

  // Conversion Form State
  const [convertData, setConvertData] = useState({
    candidateId: "",
    candidateName: "",
    joiningDate: new Date().toISOString().split("T")[0],
    departmentId: "",
    designationId: "",
    reportingToId: "",
  });

  // Candidate Create Form State
  const [newCandidate, setNewCandidate] = useState({
    jobPostingId: "",
    fullName: "",
    email: "",
    phone: "",
    yearsOfExperience: 3,
    currentCompany: "",
    expectedSalary: 1200000,
    resumeUrl: "",
  });

  // Queries
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["hr-candidates", stageFilter],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; candidates?: any[] }>(
        `/hr/recruitment/candidates${stageFilter !== "all" ? `?stage=${stageFilter}` : ""}`
      );
      return Array.isArray(res) ? res : res.data || res.candidates || [];
    },
  });

  const { data: jobList = [] } = useQuery({
    queryKey: ["hr-job-postings"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; jobs?: any[] }>("/hr/recruitment/job-postings");
      return Array.isArray(res) ? res : res.data || res.jobs || [];
    },
  });

  const { data: candidate360, isLoading: isLoading360 } = useQuery({
    queryKey: ["hr-candidate-360", selectedCandidateId],
    enabled: !!selectedCandidateId,
    queryFn: async () => {
      return await api.get<any>(`/hr/recruitment/candidates/${selectedCandidateId}/360`);
    },
  });

  // Mutations
  const createCandidateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/candidates", payload);
    },
    onSuccess: (data: any) => {
      if (data.isDuplicate) {
        setDuplicateMatch(data.existingCandidate);
        setIsDuplicateAlertOpen(true);
        toast.warning("Duplicate candidate detected by email/phone!");
      } else {
        toast.success("Candidate profile added successfully");
        queryClient.invalidateQueries({ queryKey: ["hr-candidates"] });
        setIsCreateOpen(false);
        resetCandidateForm();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create candidate");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(`/hr/recruitment/candidates/${payload.candidateId}/convert-to-employee`, {
        joiningDate: payload.joiningDate,
        departmentId: payload.departmentId || undefined,
        designationId: payload.designationId || undefined,
        reportingToId: payload.reportingToId || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Successfully converted candidate to Employee (${res.employeeCode || "Created"})!`);
      queryClient.invalidateQueries({ queryKey: ["hr-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-360"] });
      setIsConvertOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Candidate to Employee conversion failed");
    },
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      return await api.post(`/hr/recruitment/candidates/${id}/stage`, { stage });
    },
    onSuccess: () => {
      toast.success("Candidate stage updated");
      queryClient.invalidateQueries({ queryKey: ["hr-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-360"] });
    },
  });

  const resetCandidateForm = () => {
    setNewCandidate({
      jobPostingId: "",
      fullName: "",
      email: "",
      phone: "",
      yearsOfExperience: 3,
      currentCompany: "",
      expectedSalary: 1200000,
      resumeUrl: "",
    });
  };

  const filteredCandidates = candidates.filter((c: any) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const getStageBadge = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case "applied":
        return <Badge variant="outline" className="text-blue-600 border-blue-500/30">Applied</Badge>;
      case "screening":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Screening</Badge>;
      case "assessment":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Assessment</Badge>;
      case "interview":
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">Interview</Badge>;
      case "offer":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Offer</Badge>;
      case "hired":
        return <Badge className="bg-green-600 text-white">Hired</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{stage}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Candidate 360 & Talent Pool"
          description="Unified candidate identity with duplicate detection, complete evaluation timeline, and one-click atomic conversion to Employee."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Candidate
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Talent Pool"
          value={candidates.length.toString()}
          description="Active candidate profiles"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="In Interview"
          value={candidates.filter((c: any) => c.stage === "interview").length.toString()}
          description="Active rounds scheduled"
          icon={<Video className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Offers Extended"
          value={candidates.filter((c: any) => c.stage === "offer").length.toString()}
          description="Pending acceptance / onboarding"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Converted to Employees"
          value={candidates.filter((c: any) => c.stage === "hired").length.toString()}
          description="Integrated into P2 Workforce"
          icon={<UserCheck className="h-5 w-5 text-green-600" />}
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search candidate by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pipeline Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="hired">Hired (Converted)</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing <strong>{filteredCandidates.length}</strong> candidates
          </div>
        </CardContent>
      </Card>

      {/* Candidate List Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Candidates Directory</CardTitle>
          <CardDescription>
            Select any candidate to open their Candidate 360 drawer, review evaluations, or convert to Employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Target Position</TableHead>
                <TableHead>Experience & CTC</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No candidates found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((cand: any) => (
                  <TableRow key={cand.id}>
                    <TableCell>
                      <div className="font-semibold">{cand.fullName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{cand.email}</span>
                        {cand.phone && <span>• {cand.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{cand.jobPosting?.title || "General Application"}</div>
                      <div className="text-xs text-muted-foreground">
                        {cand.jobPosting?.department || "Operations"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{cand.yearsOfExperience || 0} yrs experience</div>
                      <div className="text-xs text-muted-foreground">
                        Exp: ₹{((cand.expectedSalary || 1200000) / 100000).toFixed(1)}L
                      </div>
                    </TableCell>
                    <TableCell>{getStageBadge(cand.stage)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCandidateId(cand.id)}
                        className="gap-1 text-xs"
                      >
                        <Eye className="h-3 w-3" /> Candidate 360
                      </Button>
                      {cand.stage !== "hired" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setConvertData({
                              candidateId: cand.id,
                              candidateName: cand.fullName,
                              joiningDate: new Date().toISOString().split("T")[0],
                              departmentId: cand.jobPosting?.departmentId || "",
                              designationId: cand.jobPosting?.designationId || "",
                              reportingToId: "",
                            });
                            setIsConvertOpen(true);
                          }}
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <UserCheck className="h-3 w-3" /> Convert to Employee
                        </Button>
                      ) : (
                        <Badge className="bg-green-600 text-white text-xs">P2 Linked</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Candidate 360 Sheet */}
      <Sheet open={!!selectedCandidateId} onOpenChange={(open) => !open && setSelectedCandidateId(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {isLoading360 ? (
            <div className="p-8 text-center text-muted-foreground">Loading Candidate 360...</div>
          ) : candidate360 ? (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl font-bold">{candidate360.candidate?.fullName}</SheetTitle>
                  {getStageBadge(candidate360.candidate?.stage)}
                </div>
                <SheetDescription>
                  Full lifecycle timeline including screening, scorecards, offers, and onboarding records.
                </SheetDescription>
              </SheetHeader>

              {/* Profile Card */}
              <div className="p-4 rounded-lg bg-muted/40 space-y-2 border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Email</span>
                    {candidate360.candidate?.email}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Phone</span>
                    {candidate360.candidate?.phone || "--"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Experience</span>
                    {candidate360.candidate?.yearsOfExperience || 0} years
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Current Company</span>
                    {candidate360.candidate?.currentCompany || "--"}
                  </div>
                </div>
              </div>

              {/* Lifecycle Tabs */}
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="timeline">History</TabsTrigger>
                  <TabsTrigger value="interviews">Interviews</TabsTrigger>
                  <TabsTrigger value="offers">Offer</TabsTrigger>
                  <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                </TabsList>

                {/* Tab: Timeline & Stage */}
                <TabsContent value="timeline" className="space-y-4 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Change Pipeline Stage:</span>
                    <div className="flex gap-1">
                      {["screening", "assessment", "interview", "offer", "hired"].map((stg) => (
                        <Button
                          key={stg}
                          size="sm"
                          variant={candidate360.candidate?.stage === stg ? "default" : "outline"}
                          className="text-xs capitalize"
                          onClick={() => stageMutation.mutate({ id: candidate360.candidate.id, stage: stg })}
                        >
                          {stg}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="border rounded-md p-3 space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Applications</div>
                    {candidate360.applications?.map((app: any) => (
                      <div key={app.id} className="text-sm border-b pb-2 last:border-b-0">
                        <div className="font-medium">{app.jobPosting?.title}</div>
                        <div className="text-xs text-muted-foreground">Applied on {new Date(app.appliedAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab: Interviews */}
                <TabsContent value="interviews" className="space-y-3 pt-3">
                  {candidate360.interviews?.length === 0 ? (
                    <div className="text-sm text-center py-4 text-muted-foreground">No interview rounds scheduled yet.</div>
                  ) : (
                    candidate360.interviews?.map((iv: any) => (
                      <div key={iv.id} className="border rounded-md p-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">Round #{iv.roundNumber}: {iv.roundName || "Technical Round"}</span>
                          <Badge variant="outline">{iv.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Scheduled: {new Date(iv.scheduledAt).toLocaleString()} ({iv.durationMinutes} mins)
                        </div>
                        {iv.feedback && (
                          <div className="text-xs bg-muted p-2 rounded mt-2">
                            <strong>Feedback:</strong> {iv.feedback}
                            {iv.recommendation && <span className="block font-semibold mt-1">Recommendation: {iv.recommendation}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tab: Offers */}
                <TabsContent value="offers" className="space-y-3 pt-3">
                  {candidate360.offers?.length === 0 ? (
                    <div className="text-sm text-center py-4 text-muted-foreground">No formal offers extended yet.</div>
                  ) : (
                    candidate360.offers?.map((off: any) => (
                      <div key={off.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">Annual CTC: ₹{(Number(off.annualCtc) / 100000).toFixed(2)} Lakhs</span>
                          <Badge className="bg-emerald-500/10 text-emerald-600">{off.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joining Date: {new Date(off.joiningDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tab: Onboarding */}
                <TabsContent value="onboarding" className="space-y-3 pt-3">
                  {candidate360.onboarding ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>Onboarding Status:</span>
                        <Badge>{candidate360.onboarding.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joining Date: {new Date(candidate360.onboarding.joiningDate).toLocaleDateString()}
                      </div>
                      <div className="border rounded p-2 space-y-1">
                        <div className="text-xs font-semibold">Checklist Items ({candidate360.onboarding.tasks?.length || 0}):</div>
                        {candidate360.onboarding.tasks?.map((t: any) => (
                          <div key={t.id} className="text-xs flex justify-between py-1 border-b last:border-b-0">
                            <span>{t.title}</span>
                            <Badge variant="outline">{t.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-center py-4 text-muted-foreground">Onboarding not yet initialized.</div>
                  )}
                </TabsContent>
              </Tabs>

              {candidate360.candidate?.stage !== "hired" && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      setConvertData({
                        candidateId: candidate360.candidate.id,
                        candidateName: candidate360.candidate.fullName,
                        joiningDate: new Date().toISOString().split("T")[0],
                        departmentId: "",
                        designationId: "",
                        reportingToId: "",
                      });
                      setIsConvertOpen(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <UserCheck className="h-4 w-4" /> Convert to Permanent Employee
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Convert to Employee Modal */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Convert Candidate to Employee
            </DialogTitle>
            <DialogDescription>
              Transfers candidate profile, approved CTC, and onboarding records into the authoritative P2 Employee Directory atomically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Candidate Name</Label>
              <Input value={convertData.candidateName} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Joining / Effective Date *</Label>
              <Input
                type="date"
                value={convertData.joiningDate}
                onChange={(e) => setConvertData({ ...convertData, joiningDate: e.target.value })}
              />
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-800 space-y-1">
              <strong>P2 / P4 Integration Guarantee:</strong>
              <p>
                Reuses existing EmployeeService.createEmployeeAtomic. Automatically assigns employeeCode,
                creates user login, initializes leave balances, and locks recruitment record to HIRED.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate(convertData)}
            >
              {convertMutation.isPending ? "Converting..." : "Confirm & Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Candidate Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Candidate Profile</DialogTitle>
            <DialogDescription>
              Manual intake or referral candidate. Duplicate check runs on email and phone automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Associate with Job Opening</Label>
              <Select
                value={newCandidate.jobPostingId}
                onValueChange={(val) => setNewCandidate({ ...newCandidate, jobPostingId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select active job..." />
                </SelectTrigger>
                <SelectContent>
                  {jobList.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} ({j.department || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Jane Doe"
                value={newCandidate.fullName}
                onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Years Experience</Label>
                <Input
                  type="number"
                  value={newCandidate.yearsOfExperience}
                  onChange={(e) => setNewCandidate({ ...newCandidate, yearsOfExperience: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Expected Salary (₹)</Label>
                <Input
                  type="number"
                  value={newCandidate.expectedSalary}
                  onChange={(e) => setNewCandidate({ ...newCandidate, expectedSalary: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Current Company</Label>
              <Input
                placeholder="Acme Corp"
                value={newCandidate.currentCompany}
                onChange={(e) => setNewCandidate({ ...newCandidate, currentCompany: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCandidate.fullName.trim() || !newCandidate.email.trim() || createCandidateMutation.isPending}
              onClick={() => createCandidateMutation.mutate(newCandidate)}
            >
              {createCandidateMutation.isPending ? "Saving..." : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
