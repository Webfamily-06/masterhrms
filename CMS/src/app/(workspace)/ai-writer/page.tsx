'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Settings,
  Copy,
  Download,
  Loader2,
  Key,
  Bot,
  FileText,
  Briefcase,
  Megaphone,
  Mail,
  ShoppingBag,
  HelpCircle,
  Check,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Save,
  BookOpen,
  Sliders,
  Wand2,
  Calendar,
  Globe,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



const LANGUAGES = [
  "English",
  "Arabic (العربية)",
  "Chinese (中文)",
  "Danish (Dansk)",
  "Dutch (Nederlands)",
  "French (Français)",
  "German (Deutsch)",
  "Hebrew (עברית)",
  "Hindi (हिन्दी)",
  "Italian (Italiano)",
  "Japanese (日本語)",
  "Polish (Polski)",
  "Portuguese (Português)",
  "Russian (Русский)",
  "Spanish (Español)",
  "Tamil (தமிழ்)",
  "Turkish (Türkçe)",
];

const TONES = [
  "Professional",
  "Casual",
  "Friendly",
  "Formal",
  "Creative",
  "Persuasive & Sales-Oriented",
  "Bold & Authoritative",
  "Informative & Educational",
  "Empathetic & Caring",
];

const CREATIVITY_LEVELS = [
  { label: "1 - Conservative (Strictly Factual)", value: "1" },
  { label: "3 - Low (Direct & Structured)", value: "3" },
  { label: "5 - Balanced (Recommended)", value: "5" },
  { label: "7 - High (Creative & Engaging)", value: "7" },
  { label: "10 - Maximum (Expressive & Bold)", value: "10" },
];

const TEMPLATE_CATEGORIES = [
  "All",
  "Content",
  "Blog",
  "Website",
  "Social Media",
  "Email",
  "Video",
];

const CONTENT_TYPES = [
  { id: "hr_announcement", name: "HR Announcement / Circular", icon: Megaphone, desc: "Internal updates, policy rollout, holiday notices" },
  { id: "job_description", name: "Job Description", icon: Briefcase, desc: "Role overview, key responsibilities, qualifications" },
  { id: "marketing_copy", name: "Marketing & Landing Page Copy", icon: Sparkles, desc: "High-converting sales headlines, value props, CTAs" },
  { id: "email_newsletter", name: "Email Newsletter & Campaign", icon: Mail, desc: "Engaging subject lines, weekly digests, announcements" },
  { id: "product_desc", name: "Product & Service Description", icon: ShoppingBag, desc: "E-commerce features, specs, and benefits" },
  { id: "customer_support", name: "Customer Support Resolution", icon: HelpCircle, desc: "Empathetic troubleshooting and ticketing replies" },
  { id: "general_article", name: "Business Article / Blog Post", icon: FileText, desc: "Thought leadership, industry insights, best practices" },
];

function AIWriterPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [activeTab, setActiveTab] = useState("generate");

  // Generator State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [contentType, setContentType] = useState("hr_announcement");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Internal Employees & Teams");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [characterLimit, setCharacterLimit] = useState("1500");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("Professional");
  const [creativity, setCreativity] = useState("5");
  const [numResults, setNumResults] = useState("1");
  const [customPrompt, setCustomPrompt] = useState("");

  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [editableContent, setEditableContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Template management state
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("All");
  const [templateStatusFilter, setTemplateStatusFilter] = useState("All");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    category: "Content",
    status: "Active",
    description: "",
    promptTemplate: "",
  });

  // History state
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("All");
  const [viewingHistoryItem, setViewingHistoryItem] = useState<any>(null);

  // AI API Settings state
  const [apiSettings, setApiSettings] = useState({
    provider: "openai",
    openaiKey: "",
    openaiModel: "gpt-4o",
    geminiKey: "",
    geminiModel: "gemini-1.5-pro",
    claudeKey: "",
    claudeModel: "claude-3-5-sonnet-20240620",
    groqKey: "",
    groqModel: "llama3-70b-8192",
  });

  // 1. Fetch AI Settings
  useQuery({
    queryKey: ["tenant-ai-settings", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/ai/settings");
        if (res?.data) {
          setApiSettings(res.data);
          return res.data;
        }
        return null;
      } catch {
        return null;
      }
    },
  });

  // 2. Fetch Templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["ai-templates", tenantId, templateCategoryFilter, templateStatusFilter, templateSearch],
    queryFn: async () => {
      try {
        const res = await api.get("/ai/templates", {
          params: {
            category: templateCategoryFilter !== "All" ? templateCategoryFilter : undefined,
            status: templateStatusFilter !== "All" ? templateStatusFilter : undefined,
            search: templateSearch.trim() || undefined,
          },
        });
        return res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch History
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["ai-history", tenantId, historyCategoryFilter, historySearch],
    queryFn: async () => {
      try {
        const res = await api.get("/ai/history", {
          params: {
            category: historyCategoryFilter !== "All" ? historyCategoryFilter : undefined,
            search: historySearch.trim() || undefined,
          },
        });
        return res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 4. Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/ai/settings", payload);
    },
    onSuccess: () => {
      toast.success("AI API configuration saved successfully!");
      setIsSettingsOpen(false);
      qc.invalidateQueries({ queryKey: ["tenant-ai-settings", tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save AI settings");
    },
  });

  // 5. Template CRUD Mutations
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTemplate) {
        return await api.put(`/ai/templates/${editingTemplate.id}`, data);
      }
      return await api.post("/ai/templates", data);
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Template updated!" : "Template created successfully!");
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      qc.invalidateQueries({ queryKey: ["ai-templates"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save template");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/ai/templates/${id}`);
    },
    onSuccess: () => {
      toast.success("Template deleted successfully");
      qc.invalidateQueries({ queryKey: ["ai-templates"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete template");
    },
  });

  // 6. History Save & Delete Mutations
  const saveHistoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/ai/history", payload);
    },
    onSuccess: () => {
      toast.success("Document saved to your archive!");
      qc.invalidateQueries({ queryKey: ["ai-history"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save to history");
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/ai/history/${id}`);
    },
    onSuccess: () => {
      toast.success("Document removed from history");
      if (viewingHistoryItem) setViewingHistoryItem(null);
      qc.invalidateQueries({ queryKey: ["ai-history"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete document");
    },
  });

  // Handle template selection in generator
  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    if (id === "custom") {
      setCustomPrompt("");
      return;
    }
    const tpl = templates.find((t: any) => t.id === id);
    if (tpl) {
      setCustomPrompt(tpl.promptTemplate);
      if (!topic) setTopic(tpl.title);
    }
  }

  // Generate Content Handler
  async function handleGenerate() {
    if (!topic.trim()) {
      return toast.error("Please enter a Document Title / Topic");
    }

    setIsGenerating(true);
    try {
      const selectedTpl = templates.find((t: any) => t.id === selectedTemplateId);
      const res = await api.post("/ai/generate-content", {
        contentType,
        topic: topic.trim(),
        audience: audience.trim(),
        description: description.trim(),
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        characterLimit: parseInt(characterLimit) || 1500,
        additionalInstructions: additionalInstructions.trim(),
        promptTemplate: customPrompt || (selectedTpl ? selectedTpl.promptTemplate : ""),
        language,
        tone,
        creativity: `Level ${creativity}`,
        numResults: parseInt(numResults),
        provider: apiSettings.provider,
        model:
          apiSettings.provider === "openai"
            ? apiSettings.openaiModel
            : apiSettings.provider === "gemini"
              ? apiSettings.geminiModel
              : apiSettings.claudeModel,
      });

      if (res?.data?.results && Array.isArray(res.data.results)) {
        setGeneratedResults(res.data.results);
        const initialContent = res.data.results.join("\n\n---\n\n");
        setEditableContent(initialContent);
        toast.success(`Generated ${res.data.results.length} result(s) successfully!`);
      } else {
        toast.info("Content generated successfully.");
      }
    } catch (err: any) {
      toast.error(err.message || "AI Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSaveCurrentToHistory() {
    if (!editableContent.trim()) {
      return toast.error("No content to save. Generate document first.");
    }
    const tpl = templates.find((t: any) => t.id === selectedTemplateId);
    saveHistoryMutation.mutate({
      title: topic.trim() || "Untitled Document",
      templateId: selectedTemplateId !== "custom" ? selectedTemplateId : undefined,
      templateName: tpl ? tpl.title : "Custom Generation",
      category: tpl ? tpl.category : "Content",
      language,
      tone,
      creativity: `Level ${creativity}`,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      content: editableContent,
    });
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
  }

  function downloadAsFile(text: string, title: string, ext = "md") {
    const mime = ext === "doc" ? "application/msword" : "text/markdown";
    const element = document.createElement("a");
    const file = new Blob([text], { type: mime });
    element.href = URL.createObjectURL(file);
    element.download = `${(title || "ai-document").toLowerCase().replace(/[^a-z0-9]/g, "-")}.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded as .${ext}`);
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({
      title: "",
      category: "Content",
      status: "Active",
      description: "",
      promptTemplate: "Write a professional {title} in {language} with a {tone} tone. Keywords: {keywords}.",
    });
    setIsTemplateModalOpen(true);
  }

  function openEditTemplate(tpl: any) {
    setEditingTemplate(tpl);
    setTemplateForm({
      title: tpl.title,
      category: tpl.category,
      status: tpl.status,
      description: tpl.description,
      promptTemplate: tpl.promptTemplate,
    });
    setIsTemplateModalOpen(true);
  }

  // Word usage analytics calculation
  const totalWordsSaved = history.reduce((acc: number, h: any) => acc + (h.wordCount || 0), 0);
  const totalDocsSaved = history.length;

  return (
    <PlanGuard moduleName="AI Content Generation Studio" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <BreadcrumbNav />
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="size-6 text-primary animate-pulse" /> AI Document Studio
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              15+ languages content generation, customizable prompt templates, and full document archive management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Settings className="size-3.5" /> AI Model & Key Settings
            </Button>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="generate" className="gap-2 text-xs font-semibold">
              <Sparkles className="size-3.5 text-primary" /> Document Generate Page
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 text-xs font-semibold">
              <Layers className="size-3.5 text-indigo-500" /> Document Templates
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {templates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
              <BookOpen className="size-3.5 text-emerald-500" /> Document History & Archive
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {totalDocsSaved}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DOCUMENT GENERATE PAGE */}
          <TabsContent value="generate" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: Generator Controls Form */}
              <div className="lg:col-span-5 space-y-4">
                {/* Template Selection */}
                <Card className="border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Wand2 className="size-4 text-primary" /> 1. Select Template & Category
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        Step 1 of 3
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-xs text-foreground">Choose Prompt Template</label>
                      <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Standard Content Types</SelectItem>
                          {templates
                            .filter((t: any) => t.status === "Active")
                            .map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>
                                [{t.category}] {t.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplateId === "custom" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {CONTENT_TYPES.map((type) => {
                          const isSelected = contentType === type.id;
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setContentType(type.id)}
                              className={`p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                                  : "bg-card hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <div
                                  className={`size-5 rounded-lg grid place-items-center ${
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                  }`}
                                >
                                  <Icon className="size-3" />
                                </div>
                                <span className="font-bold text-xs leading-tight line-clamp-1">{type.name}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{type.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/30 rounded-xl border text-xs space-y-1">
                        <div className="font-semibold text-[11px] text-primary">Active Template Prompt:</div>
                        <p className="text-[11px] font-mono text-muted-foreground line-clamp-3">
                          {customPrompt}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Document Topic & SEO Keywords */}
                <Card className="border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>2. Title, Keywords & Instructions</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        Step 2 of 3
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Document Title / Topic *</label>
                      <Input
                        placeholder="e.g. Employee Wellness Initiative or AI Analytics Platform"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Focus Keywords (comma-separated for SEO)</label>
                      <Input
                        placeholder="e.g. employee retention, performance, wellness, hr portal"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Target Audience</label>
                      <Input
                        placeholder="e.g. Internal Employees, Global Partners, Enterprise Clients"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Additional Instructions / Guidance</label>
                      <Textarea
                        placeholder="Provide specific notes, highlights, bullet points, or instructions..."
                        value={additionalInstructions}
                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tone, Language & Creativity */}
                <Card className="border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>3. Language, Tone & Creativity</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        Step 3 of 3
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground flex items-center gap-1">
                          <Globe className="size-3" /> Language (15+)
                        </label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((l) => (
                              <SelectItem key={l} value={l}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Tone of Voice</label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Creativity (1-10)</label>
                        <Select value={creativity} onValueChange={setCreativity}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CREATIVITY_LEVELS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Char Limit</label>
                        <Input
                          type="number"
                          min={100}
                          max={10000}
                          value={characterLimit}
                          onChange={(e) => setCharacterLimit(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="1500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Variations</label>
                        <Select value={numResults} onValueChange={setNumResults}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Variant</SelectItem>
                            <SelectItem value="2">2 Variants</SelectItem>
                            <SelectItem value="3">3 Variants</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !topic.trim()}
                      className="w-full h-9 mt-2 font-bold bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white shadow-md hover:shadow-primary/20 gap-2 text-xs"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Generating Document...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" /> Generate Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: Output Studio & Editable Textarea */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border shadow-xs h-full flex flex-col min-h-[580px]">
                  <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Bot className="size-4 text-primary" /> Generated Content Output
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Review and edit directly in the text area below, then save to history or export.
                      </CardDescription>
                    </div>

                    {editableContent && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleSaveCurrentToHistory}
                          disabled={saveHistoryMutation.isPending}
                          className="h-7 text-[11px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Save className="size-3" /> Save Document
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(editableContent)}
                          className="h-7 text-[11px] font-semibold gap-1"
                        >
                          <Copy className="size-3" /> Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAsFile(editableContent, topic, "doc")}
                          className="h-7 text-[11px] font-semibold gap-1"
                        >
                          <Download className="size-3" /> Word (.doc)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAsFile(editableContent, topic, "md")}
                          className="h-7 text-[11px] font-semibold gap-1"
                        >
                          <Download className="size-3" /> .md
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 flex-1 flex flex-col">
                    {isGenerating ? (
                      <div className="flex-1 grid place-items-center py-20 space-y-3 text-center">
                        <div className="size-14 rounded-2xl bg-primary/10 grid place-items-center animate-bounce">
                          <Sparkles className="size-7 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">AI Intelligence Writing...</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Formulating in {language} with {tone} tone and creativity level {creativity}/10.
                          </p>
                        </div>
                      </div>
                    ) : !editableContent ? (
                      <div className="flex-1 grid place-items-center py-20 text-center text-muted-foreground space-y-2">
                        <div className="size-12 rounded-2xl bg-muted grid place-items-center opacity-60">
                          <FileText className="size-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">No Document Generated Yet</h4>
                          <p className="text-xs max-w-xs mt-1">
                            Configure your document title and parameters on the left panel, then click "Generate Document".
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
                          <span>
                            Words: <strong className="text-foreground">{editableContent.trim().split(/\s+/).length}</strong> | Characters: <strong className="text-foreground">{editableContent.length}</strong>
                          </span>
                          <span className="text-primary font-medium">Editable Studio Canvas</span>
                        </div>
                        <Textarea
                          value={editableContent}
                          onChange={(e) => setEditableContent(e.target.value)}
                          rows={20}
                          className="flex-1 font-sans text-xs leading-relaxed resize-none p-4 rounded-xl border border-muted bg-card shadow-2xs"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DOCUMENT TEMPLATES */}
          <TabsContent value="templates" className="space-y-4 mt-0">
            {/* Template Filters & Add Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search templates by name..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "All" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={templateStatusFilter} onValueChange={setTemplateStatusFilter}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={openCreateTemplate}
                className="h-8 text-xs font-semibold gap-1.5 shrink-0"
              >
                <Plus className="size-3.5" /> Create Template
              </Button>
            </div>

            {/* Templates List */}
            {isLoadingTemplates ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <Card className="border-dashed p-12 text-center text-muted-foreground">
                <Layers className="size-10 mx-auto opacity-40 mb-2" />
                <h3 className="font-bold text-sm text-foreground">No Templates Found</h3>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  No prompt templates match your filter. Create a new custom template with placeholders.
                </p>
                <Button size="sm" onClick={openCreateTemplate} className="mt-4 text-xs gap-1">
                  <Plus className="size-3.5" /> Add First Template
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl: any) => (
                  <Card key={tpl.id} className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono mb-1">
                            {tpl.category}
                          </Badge>
                          <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                            {tpl.title}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={tpl.status === "Active" ? "default" : "secondary"}
                          className={`text-[10px] ${
                            tpl.status === "Active" ? "bg-emerald-600 text-white" : ""
                          }`}
                        >
                          {tpl.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {tpl.description || "Custom AI prompt template for business generation."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] font-mono text-muted-foreground line-clamp-3">
                        {tpl.promptTemplate}
                      </div>

                      <div className="flex items-center justify-between border-t pt-2 gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            setCustomPrompt(tpl.promptTemplate);
                            if (!topic) setTopic(tpl.title);
                            setActiveTab("generate");
                            toast.info(`Loaded "${tpl.title}" into Generator`);
                          }}
                          className="h-7 text-xs font-semibold gap-1 flex-1"
                        >
                          <Sparkles className="size-3" /> Use in Generator
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditTemplate(tpl)}
                          className="h-7 w-7 p-0"
                          title="Edit Template"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        {!tpl.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete template "${tpl.title}"?`)) {
                                deleteTemplateMutation.mutate(tpl.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title="Delete Template"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: DOCUMENT HISTORY & ARCHIVE */}
          <TabsContent value="history" className="space-y-4 mt-0">
            {/* Word Usage Analytics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border shadow-xs bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-foreground">{totalDocsSaved}</div>
                    <div className="text-[11px] text-muted-foreground">Archived Documents</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-indigo-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-indigo-500/10 grid place-items-center text-indigo-600 font-bold">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-foreground">{totalWordsSaved.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Total Words Generated</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-emerald-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 font-bold">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-foreground">15+</div>
                    <div className="text-[11px] text-muted-foreground">Languages Supported</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* History Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
              <div className="relative flex-1">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search document archive by title or keywords..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Select value={historyCategoryFilter} onValueChange={setHistoryCategoryFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "All" ? "All Categories" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* History Grid */}
            {isLoadingHistory ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Loading archive...
              </div>
            ) : history.length === 0 ? (
              <Card className="border-dashed p-12 text-center text-muted-foreground">
                <BookOpen className="size-10 mx-auto opacity-40 mb-2" />
                <h3 className="font-bold text-sm text-foreground">Archive is Empty</h3>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  No documents have been saved yet. Generate a document and click "Save Document" to archive it here.
                </p>
                <Button size="sm" onClick={() => setActiveTab("generate")} className="mt-4 text-xs gap-1">
                  <Sparkles className="size-3.5" /> Go to Generator
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((doc: any) => (
                  <Card key={doc.id} className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {doc.templateName || "Document"}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="size-3" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1 mt-1">
                        {doc.title}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {doc.language}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {doc.tone}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {doc.wordCount} words
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg border">
                        {doc.preview}
                      </p>

                      <div className="flex items-center justify-between border-t pt-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingHistoryItem(doc)}
                          className="h-7 text-xs font-semibold gap-1 flex-1"
                        >
                          <Eye className="size-3" /> View Full Document
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove "${doc.title}" from archive?`)) {
                              deleteHistoryMutation.mutate(doc.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Delete from Archive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* MODAL: CREATE / EDIT PROMPT TEMPLATE */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                {editingTemplate ? "Edit Prompt Template" : "Create New Prompt Template"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure custom prompts with dynamic placeholders: <code className="text-primary font-mono font-bold">{"{title}"}</code>, <code className="text-primary font-mono font-bold">{"{keywords}"}</code>, <code className="text-primary font-mono font-bold">{"{tone}"}</code>, <code className="text-primary font-mono font-bold">{"{language}"}</code>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Template Title *</label>
                <Input
                  placeholder="e.g. Executive Summary Generator"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold">Category</label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(val) => setTemplateForm({ ...templateForm, category: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Content">Content</SelectItem>
                      <SelectItem value="Blog">Blog</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Status</label>
                  <Select
                    value={templateForm.status}
                    onValueChange={(val) => setTemplateForm({ ...templateForm, status: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Description</label>
                <Input
                  placeholder="Brief summary of when to use this template..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold flex items-center justify-between">
                  <span>Prompt Template *</span>
                  <span className="text-[10px] text-muted-foreground">Use placeholders</span>
                </label>
                <Textarea
                  placeholder="Write a high-converting article for {title}. Keywords: {keywords}. Tone: {tone}. Language: {language}."
                  value={templateForm.promptTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, promptTemplate: e.target.value })}
                  rows={4}
                  className="text-xs font-mono resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saveTemplateMutation.isPending || !templateForm.title || !templateForm.promptTemplate}
                onClick={() => saveTemplateMutation.mutate(templateForm)}
              >
                {saveTemplateMutation.isPending ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: VIEW FULL DOCUMENT FROM ARCHIVE */}
        <Dialog open={!!viewingHistoryItem} onOpenChange={(open) => !open && setViewingHistoryItem(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {viewingHistoryItem?.templateName}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {viewingHistoryItem?.language}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {viewingHistoryItem?.tone}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold">
                {viewingHistoryItem?.title}
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-3">
                <span>Created: {viewingHistoryItem ? new Date(viewingHistoryItem.createdAt).toLocaleString() : ""}</span>
                <span>•</span>
                <span>{viewingHistoryItem?.wordCount} words</span>
                <span>•</span>
                <span>{viewingHistoryItem?.characterCount} characters</span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl border bg-muted/20 font-sans text-xs leading-relaxed whitespace-pre-wrap select-text">
              {viewingHistoryItem?.content}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm("Delete this document from archive?")) {
                    deleteHistoryMutation.mutate(viewingHistoryItem.id);
                  }
                }}
                className="text-xs gap-1"
              >
                <Trash2 className="size-3" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(viewingHistoryItem.content)}
                  className="text-xs gap-1"
                >
                  <Copy className="size-3" /> Copy Full Text
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadAsFile(viewingHistoryItem.content, viewingHistoryItem.title, "doc")}
                  className="text-xs gap-1"
                >
                  <Download className="size-3" /> Word (.doc)
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setTopic(viewingHistoryItem.title);
                    setEditableContent(viewingHistoryItem.content);
                    setActiveTab("generate");
                    setViewingHistoryItem(null);
                    toast.info("Document loaded into Studio Editor!");
                  }}
                  className="text-xs gap-1"
                >
                  <Edit className="size-3" /> Open in Editor
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: AI MULTI-PROVIDER SETTINGS CONFIGURATION */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Key className="size-4 text-primary" /> AI Multi-Provider API Configuration
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select your AI provider and enter your API key to power document generation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">AI Provider</label>
                <Select
                  value={apiSettings.provider}
                  onValueChange={(val) => setApiSettings({ ...apiSettings, provider: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4 / GPT-4 Turbo)</SelectItem>
                    <SelectItem value="claude">Anthropic Claude (claude-sonnet-4-5 / claude-3-5-sonnet)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (gemini-2.5-flash / gemini-1.5-pro)</SelectItem>
                    <SelectItem value="groq">Groq Cloud (Llama 3 70B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {apiSettings.provider === "openai" && (
                <div className="space-y-2 border-t pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold">OpenAI API Key (sk-...)</label>
                    <Input
                      type="password"
                      placeholder="sk-proj-..."
                      value={apiSettings.openaiKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, openaiKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">OpenAI Model</label>
                    <Select
                      value={apiSettings.openaiModel}
                      onValueChange={(val) => setApiSettings({ ...apiSettings, openaiModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Latest Flagship)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {apiSettings.provider === "gemini" && (
                <div className="space-y-2 border-t pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold">Google Gemini API Key</label>
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiSettings.geminiKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, geminiKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Gemini Model</label>
                    <Select
                      value={apiSettings.geminiModel}
                      onValueChange={(val) => setApiSettings({ ...apiSettings, geminiModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (Fast & Accurate)</SelectItem>
                        <SelectItem value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning)</SelectItem>
                        <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {apiSettings.provider === "claude" && (
                <div className="space-y-2 border-t pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold">Anthropic Claude API Key</label>
                    <Input
                      type="password"
                      placeholder="sk-ant-..."
                      value={apiSettings.claudeKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, claudeKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Claude Model</label>
                    <Select
                      value={apiSettings.claudeModel}
                      onValueChange={(val) => setApiSettings({ ...apiSettings, claudeModel: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-sonnet-4-5">claude-sonnet-4-5</SelectItem>
                        <SelectItem value="claude-opus-4-1">claude-opus-4-1</SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20240620">claude-3-5-sonnet</SelectItem>
                        <SelectItem value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {apiSettings.provider === "groq" && (
                <div className="space-y-2 border-t pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold">Groq API Key</label>
                    <Input
                      type="password"
                      placeholder="gsk_..."
                      value={apiSettings.groqKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, groqKey: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saveSettingsMutation.isPending}
                onClick={() => saveSettingsMutation.mutate(apiSettings)}
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

export default AIWriterPage;
