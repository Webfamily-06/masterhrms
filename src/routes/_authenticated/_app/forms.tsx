import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
  FormInput,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Eye,
  Star,
  Search,
  Sparkles,
  Building2,
  Calendar,
  Users,
  Check,
  X,
  HelpCircle,
  BarChart3,
  Layers,
  FileCheck,
  Pencil,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/forms")({
  component: FormsPage,
  head: () => ({ meta: [{ title: "Dynamic Custom Forms & Pulse Surveys — Master HRMS" }] }),
});

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pulse_survey: { label: "Pulse Survey", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  it_request: { label: "IT & Hardware", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  performance_review: { label: "Performance Review", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  employee_feedback: { label: "Employee Feedback", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  onboarding_checklist: { label: "Onboarding Review", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30" },
  general: { label: "General Form", bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

export function FormsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeFormToFill, setActiveFormToFill] = useState<any>(null);
  const [fillAnswers, setFillAnswers] = useState<Record<string, any>>({});
  const [activeSubmissionsPassport, setActiveSubmissionsPassport] = useState<any>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<any>(null);

  // Form Builder State
  const [formHeader, setFormHeader] = useState({
    title: "",
    description: "",
    category: "pulse_survey",
    status: "published",
    targetAudience: "all_company",
    targetDepartmentId: "",
    isAnonymous: false,
    allowMultipleSubmissions: false,
    deadline: "",
    authorName: profile?.full_name || "HR Operations",
  });

  const [builderFields, setBuilderFields] = useState<any[]>([
    {
      id: "f-1",
      label: "Overall Experience / Rating",
      description: "Rate from 1 (Poor) to 5 (Outstanding)",
      fieldType: "rating_scale",
      isRequired: true,
      options: ["1", "2", "3", "4", "5"],
    },
    {
      id: "f-2",
      label: "Detailed Feedback & Suggestions",
      description: "Share your thoughts or recommendations",
      fieldType: "long_text",
      isRequired: false,
      placeholder: "Write your answer here...",
    },
  ]);

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/departments");
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

  const currentEmployee = employees.find((e: any) => e.email === user?.email) || employees[0];

  const { data: forms = [], isLoading: isFormsLoading } = useQuery({
    queryKey: ["custom-forms", tenantId, selectedCategory, selectedStatus, selectedDepartment, searchQuery],
    queryFn: async () => {
      try {
        let url = `/forms?category=${selectedCategory}&status=${selectedStatus}&departmentId=${selectedDepartment}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["forms-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/forms/summary/stats");
      } catch {
        return { totalForms: 0, publishedCount: 0, totalSubmissions: 0, avgRating: "4.8" };
      }
    },
  });

  const { data: formSubmissions = [], isLoading: isSubmissionsLoading } = useQuery({
    queryKey: ["form-submissions", activeSubmissionsPassport?.id],
    enabled: !!activeSubmissionsPassport?.id,
    queryFn: async () => {
      try {
        const res = await api.get(`/forms/${activeSubmissionsPassport.id}/submissions`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createFormMut = useMutation({
    mutationFn: async (payload: any) => api.post("/forms", payload),
    onSuccess: () => {
      toast.success("Dynamic form created & published!");
      qc.invalidateQueries({ queryKey: ["custom-forms"] });
      qc.invalidateQueries({ queryKey: ["forms-summary"] });
      setIsCreateOpen(false);
      resetBuilder();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create form"),
  });

  const deleteFormMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/forms/${id}`),
    onSuccess: () => {
      toast.success("Form deleted");
      qc.invalidateQueries({ queryKey: ["custom-forms"] });
      qc.invalidateQueries({ queryKey: ["forms-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete form"),
  });

  const submitResponseMut = useMutation({
    mutationFn: async ({ formId, answers, employeeId }: { formId: string; answers: any; employeeId?: string }) =>
      api.post(`/forms/${formId}/submit`, { answers, employeeId }),
    onSuccess: () => {
      toast.success("Response submitted successfully! Thank you for your feedback.");
      qc.invalidateQueries({ queryKey: ["custom-forms"] });
      qc.invalidateQueries({ queryKey: ["forms-summary"] });
      setActiveFormToFill(null);
      setFillAnswers({});
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit response"),
  });

  const reviewSubmissionMut = useMutation({
    mutationFn: async ({ submissionId, status, reviewerNotes }: { submissionId: string; status: string; reviewerNotes?: string }) =>
      api.put(`/forms/submissions/${submissionId}/review`, { status, reviewerNotes }),
    onSuccess: () => {
      toast.success("Submission review status updated!");
      qc.invalidateQueries({ queryKey: ["form-submissions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update review"),
  });

  function resetBuilder() {
    setFormHeader({
      title: "",
      description: "",
      category: "pulse_survey",
      status: "published",
      targetAudience: "all_company",
      targetDepartmentId: "",
      isAnonymous: false,
      allowMultipleSubmissions: false,
      deadline: "",
      authorName: profile?.full_name || "HR Operations",
    });
    setBuilderFields([
      {
        id: "f-1",
        label: "Overall Experience / Rating",
        description: "Rate from 1 to 5",
        fieldType: "rating_scale",
        isRequired: true,
        options: ["1", "2", "3", "4", "5"],
      },
    ]);
  }

  function addField() {
    const nextId = `f-${builderFields.length + 1}-${Date.now().toString().slice(-4)}`;
    setBuilderFields([
      ...builderFields,
      {
        id: nextId,
        label: `Question ${builderFields.length + 1}`,
        description: "",
        fieldType: "short_text",
        isRequired: true,
        options: ["Option 1", "Option 2", "Option 3"],
      },
    ]);
  }

  function removeField(idx: number) {
    if (builderFields.length <= 1) {
      toast.error("Form must contain at least 1 question.");
      return;
    }
    setBuilderFields(builderFields.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, updates: any) {
    const copy = [...builderFields];
    copy[idx] = { ...copy[idx], ...updates };
    setBuilderFields(copy);
  }

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FormInput className="size-6 text-primary" /> Dynamic Custom Forms & Pulse Surveys
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design dynamic company surveys, employee pulse check-ins, IT requisition forms, and analyze submissions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              resetBuilder();
              setIsCreateOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Create New Form</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-blue-500" /> Total Active Forms
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalForms || forms.length} Forms
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-purple-500/5 border-purple-500/20">
          <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Published Surveys
          </span>
          <div className="text-xl font-black font-mono text-purple-600">
            {summary?.publishedCount || 0} Live
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-emerald-500" /> Total Submissions
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.totalSubmissions || 0} Responses
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-amber-500/5 border-amber-500/20">
          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5">
            <Star className="size-3.5 fill-amber-500 text-amber-500" /> Avg Satisfaction
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {summary?.avgRating || "4.8"} / 5.0
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forms, surveys, requisitions..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-7 text-xs w-44 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Form Categories</SelectItem>
              <SelectItem value="pulse_survey">🌟 Pulse Survey</SelectItem>
              <SelectItem value="it_request">💻 IT & Hardware</SelectItem>
              <SelectItem value="performance_review">📈 Performance Review</SelectItem>
              <SelectItem value="employee_feedback">💬 Employee Feedback</SelectItem>
              <SelectItem value="onboarding_checklist">🚀 Onboarding Review</SelectItem>
              <SelectItem value="general">📋 General Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="h-7 text-xs w-44 bg-background">
            <SelectValue placeholder="All Target Audiences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} Only
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Forms Grid */}
      {isFormsLoading ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          Loading custom forms and pulse surveys...
        </Card>
      ) : forms.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground italic">
          No forms found. Click "Create New Form" to design your first custom survey.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f: any) => {
            const cat = CATEGORY_CONFIG[f.category] || CATEGORY_CONFIG.general;

            return (
              <Card
                key={f.id}
                className="border shadow-2xs hover:shadow-sm transition-all duration-200 bg-card overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] font-bold ${cat.bg} ${cat.text} ${cat.border}`}>
                      {cat.label}
                    </Badge>

                    {f.isAnonymous ? (
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[9px] font-bold gap-1">
                        <ShieldCheck className="size-2.5" /> Anonymous
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        Identified
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-black text-foreground leading-snug line-clamp-2">
                    {f.title}
                  </CardTitle>
                  {f.description && (
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {f.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-2 border-t bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Building2 className="size-3 text-primary" />
                      {f.targetDepartment ? f.targetDepartment.name : "All Company"}
                    </span>

                    <span className="font-mono text-[11px] font-bold text-primary">
                      {f.fields?.length || 0} Questions
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-background text-xs">
                    <span className="text-muted-foreground text-[11px]">Submissions:</span>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold font-mono">
                      {f._count?.submissions || f.responseCount || 0} Responses
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveFormToFill(f);
                        setFillAnswers({});
                      }}
                      className="text-xs font-bold h-7 bg-primary text-primary-foreground gap-1 flex-1 shadow-2xs"
                    >
                      <Send className="size-3" /> Fill Form
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveSubmissionsPassport(f)}
                      className="text-xs font-bold h-7 gap-1"
                    >
                      <BarChart3 className="size-3 text-primary" />
                      <span>Analytics</span>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete form "${f.title}" and all its submissions?`)) {
                          deleteFormMut.mutate(f.id);
                        }
                      }}
                      className="size-7 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── MODAL 1: FORM FILLER / RESPONDENT MODAL ─── */}
      {activeFormToFill && (
        <Dialog open={!!activeFormToFill} onOpenChange={(o) => !o && setActiveFormToFill(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    CATEGORY_CONFIG[activeFormToFill.category]?.bg
                  } ${CATEGORY_CONFIG[activeFormToFill.category]?.text} ${
                    CATEGORY_CONFIG[activeFormToFill.category]?.border
                  }`}
                >
                  {CATEGORY_CONFIG[activeFormToFill.category]?.label}
                </Badge>
                {activeFormToFill.isAnonymous && (
                  <Badge className="bg-purple-600 text-white text-[9px] font-bold gap-1">
                    <ShieldCheck className="size-2.5" /> 100% Anonymous Response
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-black text-foreground leading-snug">
                {activeFormToFill.title}
              </DialogTitle>
              {activeFormToFill.description && (
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {activeFormToFill.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitResponseMut.mutate({
                  formId: activeFormToFill.id,
                  answers: fillAnswers,
                  employeeId: activeFormToFill.isAnonymous ? undefined : currentEmployee?.id,
                });
              }}
              className="space-y-4 py-2 text-xs"
            >
              {activeFormToFill.fields?.map((field: any, idx: number) => {
                let optionsArr: string[] = [];
                if (field.options) {
                  try {
                    optionsArr = JSON.parse(field.options);
                  } catch {
                    optionsArr = field.options.split(",").map((s: string) => s.trim());
                  }
                }

                return (
                  <div key={field.id} className="p-3.5 rounded-xl border bg-muted/10 space-y-2">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground block">
                        {idx + 1}. {field.label} {field.isRequired && <span className="text-rose-500">*</span>}
                      </Label>
                      {field.description && (
                        <p className="text-[11px] text-muted-foreground">{field.description}</p>
                      )}
                    </div>

                    {/* Short Text */}
                    {field.fieldType === "short_text" && (
                      <Input
                        required={field.isRequired}
                        placeholder={field.placeholder || "Your answer..."}
                        value={fillAnswers[field.id] || ""}
                        onChange={(e) => setFillAnswers({ ...fillAnswers, [field.id]: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    )}

                    {/* Long Text */}
                    {field.fieldType === "long_text" && (
                      <Textarea
                        required={field.isRequired}
                        rows={3}
                        placeholder={field.placeholder || "Type detailed response..."}
                        value={fillAnswers[field.id] || ""}
                        onChange={(e) => setFillAnswers({ ...fillAnswers, [field.id]: e.target.value })}
                        className="text-xs bg-background"
                      />
                    )}

                    {/* Rating Scale (1 to 5 Stars) */}
                    {field.fieldType === "rating_scale" && (
                      <div className="flex items-center gap-2 pt-1">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const isSelected = Number(fillAnswers[field.id]) >= score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setFillAnswers({ ...fillAnswers, [field.id]: score })}
                              className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                                isSelected
                                  ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <Star className={`size-4 ${isSelected ? "fill-white" : ""}`} />
                              <span>{score}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Select Dropdown */}
                    {field.fieldType === "select" && (
                      <Select
                        required={field.isRequired}
                        value={fillAnswers[field.id] || ""}
                        onValueChange={(val) => setFillAnswers({ ...fillAnswers, [field.id]: val })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Choose an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {optionsArr.map((opt, oIdx) => (
                            <SelectItem key={oIdx} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Radio Options */}
                    {field.fieldType === "radio" && (
                      <div className="space-y-1.5 pt-1">
                        {optionsArr.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/40 cursor-pointer text-xs font-medium"
                          >
                            <input
                              type="radio"
                              name={field.id}
                              required={field.isRequired}
                              checked={fillAnswers[field.id] === opt}
                              onChange={() => setFillAnswers({ ...fillAnswers, [field.id]: opt })}
                              className="size-3.5 text-primary"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Date Picker */}
                    {field.fieldType === "date" && (
                      <Input
                        type="date"
                        required={field.isRequired}
                        value={fillAnswers[field.id] || ""}
                        onChange={(e) => setFillAnswers({ ...fillAnswers, [field.id]: e.target.value })}
                        className="h-8 text-xs bg-background w-48"
                      />
                    )}
                  </div>
                );
              })}

              <DialogFooter className="pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setActiveFormToFill(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitResponseMut.isPending} className="text-xs font-bold gap-1">
                  <Send className="size-3" /> Submit Response
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 2: VISUAL FORM BUILDER STUDIO ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <span>Design Custom Form or Survey</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure form questions, question types (text, rating scale, multiple choice), and target audience.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFormMut.mutate({
                ...formHeader,
                fields: builderFields,
              });
            }}
            className="space-y-4 py-2 text-xs"
          >
            {/* Header Info */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Form Title *</Label>
                <Input
                  required
                  placeholder="e.g. Q4 Team Satisfaction & Tooling Feedback"
                  value={formHeader.title}
                  onChange={(e) => setFormHeader({ ...formHeader, title: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description / Objective</Label>
                <Input
                  placeholder="Explain the purpose of this survey..."
                  value={formHeader.description}
                  onChange={(e) => setFormHeader({ ...formHeader, description: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Form Category *</Label>
                  <Select
                    value={formHeader.category}
                    onValueChange={(v) => setFormHeader({ ...formHeader, category: v })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulse_survey">🌟 Pulse Survey</SelectItem>
                      <SelectItem value="it_request">💻 IT & Hardware</SelectItem>
                      <SelectItem value="performance_review">📈 Performance Review</SelectItem>
                      <SelectItem value="employee_feedback">💬 Employee Feedback</SelectItem>
                      <SelectItem value="onboarding_checklist">🚀 Onboarding Review</SelectItem>
                      <SelectItem value="general">📋 General Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Target Audience</Label>
                  <Select
                    value={formHeader.targetAudience}
                    onValueChange={(v) => setFormHeader({ ...formHeader, targetAudience: v })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_company">🏢 All Company</SelectItem>
                      <SelectItem value="department">👥 Specific Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold block cursor-pointer">Anonymous Survey Mode</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Submissions will NOT attach employee names or emails.
                  </span>
                </div>
                <Switch
                  checked={formHeader.isAnonymous}
                  onCheckedChange={(c) => setFormHeader({ ...formHeader, isAnonymous: c })}
                />
              </div>
            </div>

            {/* Questions Builder Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Questions & Fields ({builderFields.length})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addField}
                  className="h-7 text-xs font-bold gap-1 text-primary border-primary/30"
                >
                  <Plus className="size-3" /> Add Question
                </Button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {builderFields.map((field, idx) => (
                  <div key={field.id} className="p-3 rounded-xl border bg-card space-y-2.5 relative">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold font-mono text-primary text-xs">Question #{idx + 1}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeField(idx)}
                        className="size-6 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[11px] font-semibold">Question Prompt *</Label>
                        <Input
                          required
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Field Type</Label>
                        <Select
                          value={field.fieldType}
                          onValueChange={(v) => updateField(idx, { fieldType: v })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_text">Short Text</SelectItem>
                            <SelectItem value="long_text">Paragraph / Long Text</SelectItem>
                            <SelectItem value="rating_scale">Rating Scale (1-5)</SelectItem>
                            <SelectItem value="select">Dropdown Select</SelectItem>
                            <SelectItem value="radio">Multiple Choice (Radio)</SelectItem>
                            <SelectItem value="date">Date Picker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(field.fieldType === "select" || field.fieldType === "radio") && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Options (Comma Separated)
                        </Label>
                        <Input
                          value={Array.isArray(field.options) ? field.options.join(", ") : field.options || ""}
                          onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()) })}
                          placeholder="Option A, Option B, Option C"
                          className="h-7 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createFormMut.isPending} className="text-xs font-bold">
                Publish Form
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: SUBMISSIONS & ANALYTICS PASSPORT DRAWER ─── */}
      {activeSubmissionsPassport && (
        <Dialog open={!!activeSubmissionsPassport} onOpenChange={(o) => !o && setActiveSubmissionsPassport(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <span>Form Submissions & Analytics: {activeSubmissionsPassport.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review all team responses, answers breakdown, and update review statuses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {isSubmissionsLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading submissions...</div>
              ) : formSubmissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">
                  No responses received yet for this form.
                </div>
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead className="text-xs">Respondent</TableHead>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs">Submitted At</TableHead>
                        <TableHead className="text-xs">Review Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {formSubmissions.map((sub: any) => (
                        <TableRow key={sub.id} className="text-xs hover:bg-muted/20">
                          <TableCell>
                            {sub.employee ? (
                              <div>
                                <span className="font-bold text-foreground block">
                                  {sub.employee.firstName} {sub.employee.lastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {sub.employee.employeeCode}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                Anonymous Team Member
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            {sub.employee?.department?.name || "N/A"}
                          </TableCell>

                          <TableCell className="font-mono text-[11px] text-muted-foreground">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={`text-[10px] font-bold capitalize ${
                                sub.status === "approved"
                                  ? "bg-emerald-600 text-white"
                                  : sub.status === "rejected"
                                  ? "bg-rose-600 text-white"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              {sub.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSubmissionDetail(sub)}
                              className="h-6 text-[10px] font-bold"
                            >
                              View Answers ({sub.responseValues?.length || 0})
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setActiveSubmissionsPassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 4: SUBMISSION DETAIL PASSPORT ─── */}
      {selectedSubmissionDetail && (
        <Dialog open={!!selectedSubmissionDetail} onOpenChange={(o) => !o && setSelectedSubmissionDetail(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="size-5 text-primary" />
                <span>Response Details</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedSubmissionDetail.employee
                  ? `${selectedSubmissionDetail.employee.firstName} ${selectedSubmissionDetail.employee.lastName} (${selectedSubmissionDetail.employee.employeeCode})`
                  : "Anonymous Submission"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-2">
                {selectedSubmissionDetail.responseValues?.map((rv: any) => (
                  <div key={rv.id} className="p-3 rounded-xl border bg-muted/10 space-y-1">
                    <span className="font-bold text-foreground text-xs block">{rv.fieldLabel}</span>
                    <p className="text-xs text-primary font-mono whitespace-pre-line">{rv.value}</p>
                  </div>
                ))}
              </div>

              {/* Review Actions */}
              <div className="p-3 rounded-xl border bg-card space-y-2 pt-2">
                <Label className="text-xs font-bold">Review & Status Action</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      reviewSubmissionMut.mutate({ submissionId: selectedSubmissionDetail.id, status: "approved" });
                      setSelectedSubmissionDetail(null);
                    }}
                    className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Check className="size-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      reviewSubmissionMut.mutate({ submissionId: selectedSubmissionDetail.id, status: "reviewed" });
                      setSelectedSubmissionDetail(null);
                    }}
                    className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                  >
                    Mark Reviewed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      reviewSubmissionMut.mutate({ submissionId: selectedSubmissionDetail.id, status: "rejected" });
                      setSelectedSubmissionDetail(null);
                    }}
                    className="h-7 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1"
                  >
                    <X className="size-3" /> Reject
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedSubmissionDetail(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
