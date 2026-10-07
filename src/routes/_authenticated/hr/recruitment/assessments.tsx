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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  FileCheck,
  Percent,
  Play,
  CheckSquare,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/assessments")({
  component: HrAssessmentsPage,
});

export default function HrAssessmentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Template Form State
  const [templateData, setTemplateData] = useState({
    title: "Full Stack React & Node Assessment",
    description: "Evaluates architectural concepts, async programming, and state management.",
    category: "Technical",
    durationMinutes: 60,
    passingScore: 70,
  });

  // Assign Form State
  const [assignData, setAssignData] = useState({
    templateId: "",
    candidateId: "",
  });

  // Queries
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["hr-assessment-templates"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; templates?: any[] }>("/hr/recruitment/assessments/templates");
      return Array.isArray(res) ? res : res.data || res.templates || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["hr-candidates-assessments"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[]; candidates?: any[] }>("/hr/recruitment/candidates");
      return Array.isArray(res) ? res : res.data || res.candidates || [];
    },
  });

  // Create Template Mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/assessments/templates", {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        durationMinutes: Number(payload.durationMinutes),
        passingScore: Number(payload.passingScore),
        questionsJson: [
          {
            id: "q1",
            text: "What is the primary benefit of immutability in state management?",
            type: "MULTIPLE_CHOICE",
            options: ["Faster renders", "Predictable state transitions", "Lower memory usage"],
            correctAnswer: "Predictable state transitions",
            points: 10,
          },
          {
            id: "q2",
            text: "Which HTTP status code is used for idempotency conflicts?",
            type: "MULTIPLE_CHOICE",
            options: ["400", "409", "500"],
            correctAnswer: "409",
            points: 10,
          },
        ],
      });
    },
    onSuccess: () => {
      toast.success("Assessment template created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-assessment-templates"] });
      setIsCreateTemplateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create template");
    },
  });

  // Assign Assessment Mutation
  const assignMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/assessments/assign", {
        templateId: payload.templateId,
        candidateId: payload.candidateId,
      });
    },
    onSuccess: () => {
      toast.success("Assessment assigned to candidate");
      setIsAssignOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign assessment");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Skill Assessments & Evaluation"
          description="Automated candidate testing, customizable question banks, passing thresholds, and auto-graded results."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAssignOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Play className="h-4 w-4" /> Assign to Candidate
          </Button>
          <Button
            onClick={() => setIsCreateTemplateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Test Template
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Templates Library"
          value={templates.length.toString()}
          description="Standardized tests"
          icon={<FileCheck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Avg Pass Threshold"
          value="70%"
          description="Minimum criteria"
          icon={<Percent className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Auto-Graded Questions"
          value="Active"
          description="Automated evaluation"
          icon={<CheckSquare className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Passing Candidates"
          value="88%"
          description="Benchmark success rate"
          icon={<Award className="h-5 w-5 text-amber-600" />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Test Templates Library</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Templates</CardTitle>
              <CardDescription>
                Reusable questionnaires with auto-grading rules and configurable duration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Passing Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No assessment templates found. Create your first template.
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((tpl: any) => (
                      <TableRow key={tpl.id}>
                        <TableCell>
                          <div className="font-semibold">{tpl.title}</div>
                          <div className="text-xs text-muted-foreground">{tpl.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tpl.category || "General"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Clock className="inline h-3 w-3 mr-1 text-muted-foreground" />
                          {tpl.durationMinutes} mins
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-emerald-600">
                          {tpl.passingScore}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAssignData({ templateId: tpl.id, candidateId: "" });
                              setIsAssignOpen(true);
                            }}
                            className="text-xs gap-1"
                          >
                            <Play className="h-3 w-3" /> Assign
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

      {/* Create Template Dialog */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Assessment Template</DialogTitle>
            <DialogDescription>
              Configure duration, category, and minimum passing threshold.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Template Title *</Label>
              <Input
                value={templateData.title}
                onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Input
                value={templateData.category}
                onChange={(e) => setTemplateData({ ...templateData, category: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (Minutes)</Label>
                <Input
                  type="number"
                  value={templateData.durationMinutes}
                  onChange={(e) => setTemplateData({ ...templateData, durationMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={templateData.passingScore}
                  onChange={(e) => setTemplateData({ ...templateData, passingScore: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={templateData.description}
                onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!templateData.title.trim() || createTemplateMutation.isPending}
              onClick={() => createTemplateMutation.mutate(templateData)}
            >
              {createTemplateMutation.isPending ? "Creating..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Assessment to Candidate</DialogTitle>
            <DialogDescription>
              Candidate will receive test invite and link to complete the questionnaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Assessment Template *</Label>
              <Select
                value={assignData.templateId}
                onValueChange={(val) => setAssignData({ ...assignData, templateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl: any) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Candidate *</Label>
              <Select
                value={assignData.candidateId}
                onValueChange={(val) => setAssignData({ ...assignData, candidateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!assignData.templateId || !assignData.candidateId || assignMutation.isPending}
              onClick={() => assignMutation.mutate(assignData)}
            >
              {assignMutation.isPending ? "Assigning..." : "Send Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
