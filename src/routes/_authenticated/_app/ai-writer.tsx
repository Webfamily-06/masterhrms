import { createFileRoute } from "@tanstack/react-router";
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
  Send,
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
  CheckCircle2,
  Share2,
  RefreshCw,
  FolderLock,
} from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ai-writer")({
  component: AIWriterPage,
  head: () => ({ meta: [{ title: "AI Content Studio — Master ERP" }] }),
});

const LANGUAGES = [
  "English",
  "Tamil (தமிழ்)",
  "Hindi (हिन्दी)",
  "Spanish (Español)",
  "French (Français)",
  "German (Deutsch)",
  "Arabic (العربية)",
  "Portuguese (Português)",
  "Japanese (日本語)",
  "Italian (Italiano)",
];

const TONES = [
  "Professional",
  "Casual & Friendly",
  "Persuasive & Sales-Oriented",
  "Bold & Authoritative",
  "Informative & Educational",
  "Empathetic & Caring",
  "Enthusiastic & Energetic",
  "Luxury & Sophisticated",
];

const CREATIVITY_LEVELS = [
  { label: "Low (Direct & Factual)", value: "Low" },
  { label: "Balanced (Recommended)", value: "Balanced" },
  { label: "High (Creative & Engaging)", value: "High" },
  { label: "Maximum (Bold & Expressive)", value: "Maximum" },
];

const LENGTH_OPTIONS = [
  { label: "Short (~100 words)", value: "Short" },
  { label: "Medium (~300 words)", value: "Medium" },
  { label: "Long (~700 words)", value: "Long" },
  { label: "Comprehensive Article (~1500 words)", value: "Comprehensive" },
];

const CONTENT_TYPES = [
  { id: "hr_announcement", name: "HR Announcement / Circular", icon: Megaphone, desc: "Internal employee updates, policy rollout, holiday notices" },
  { id: "job_description", name: "Job Description", icon: Briefcase, desc: "Role overview, key responsibilities, requirements, benefits" },
  { id: "marketing_copy", name: "Marketing & Landing Page Copy", icon: Sparkles, desc: "High-converting sales headlines, value props, CTAs" },
  { id: "email_newsletter", name: "Email Newsletter & Campaign", icon: Mail, desc: "Engaging subject lines, weekly digests, announcements" },
  { id: "product_desc", name: "Product & Service Description", icon: ShoppingBag, desc: "E-commerce features, technical specs, benefits" },
  { id: "customer_support", name: "Customer Support Resolution", icon: HelpCircle, desc: "Polite, empathetic troubleshooting and ticketing replies" },
  { id: "general_article", name: "Business Article / Blog Post", icon: FileText, desc: "Thought leadership, industry insights, best practices" },
];

export function AIWriterPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || "default";

  const [contentType, setContentType] = useState("hr_announcement");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Internal Employees & Teams");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("Professional");
  const [creativity, setCreativity] = useState("Balanced");
  const [numResults, setNumResults] = useState("1");
  const [maxLength, setMaxLength] = useState("Medium");

  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
  const { data: savedSettings } = useQuery({
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

  // 2. Save AI Settings Mutation
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

  // 3. Generate Content Handler
  async function handleGenerate() {
    if (!topic.trim()) {
      return toast.error("Please enter a Topic or Product Title to generate content");
    }

    setIsGenerating(true);
    try {
      const res = await api.post("/ai/generate-content", {
        contentType,
        topic: topic.trim(),
        audience: audience.trim(),
        description: description.trim(),
        language,
        tone,
        creativity,
        numResults: parseInt(numResults),
        maxLength,
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

  // Copy Handlers
  function copyFullText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("✓ Full text copied to clipboard!");
  }

  function copySelectedText() {
    const selected = window.getSelection()?.toString();
    if (!selected) {
      return toast.info("Please highlight/select text inside the preview box first.");
    }
    navigator.clipboard.writeText(selected);
    toast.success("✓ Selected text copied to clipboard!");
  }

  function downloadAsMarkdown(text: string, title: string) {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "ai-content"}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("✓ Downloaded as Markdown (.md)");
  }

  return (
    <PlanGuard moduleName="AI Content Generation Studio" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="size-6 text-primary animate-pulse" /> AI Content Generation Studio
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-Model AI copywriter for HR announcements, job descriptions, marketing campaigns & email newsletters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Settings className="size-3.5" /> AI API Key Settings
            </Button>
          </div>
        </div>

        {/* Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Generator Controls Form */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>1. Select Content Type</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Step 1 of 3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTENT_TYPES.map((type) => {
                    const isSelected = contentType === type.id;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setContentType(type.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                            : "bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`size-6 rounded-lg grid place-items-center ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                            }`}
                          >
                            <Icon className="size-3.5" />
                          </div>
                          <span className="font-bold text-xs leading-tight line-clamp-1">{type.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{type.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>2. Topic & Description</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Step 2 of 3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Topic / Title / Role *</label>
                  <Input
                    placeholder="e.g. Q3 Company Townhall Announcement or Senior React Architect"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Target Audience</label>
                  <Input
                    placeholder="e.g. Internal Employees, Job Candidates, B2B Clients"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Description & Specific Points to Include
                  </label>
                  <Textarea
                    placeholder="Provide key highlights, dates, requirements, or perks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>3. Tone, Creativity & Output Parameters</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Step 3 of 3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Language</label>
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
                    <label className="font-semibold text-foreground">Creativity</label>
                    <Select value={creativity} onValueChange={setCreativity}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATIVITY_LEVELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Length</label>
                    <Select value={maxLength} onValueChange={setMaxLength}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LENGTH_OPTIONS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Variants</label>
                    <Select value={numResults} onValueChange={setNumResults}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Result</SelectItem>
                        <SelectItem value="2">2 Results</SelectItem>
                        <SelectItem value="3">3 Results</SelectItem>
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
                      <Loader2 className="size-4 animate-spin" /> Generating AI Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Generate AI Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Output Studio & Result Cards */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border shadow-xs h-full flex flex-col min-h-[550px]">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bot className="size-4 text-primary" /> Generated Content Output
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Interactive preview with 1-click full copy, selected text copy, and export.
                  </CardDescription>
                </div>

                {generatedResults.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copySelectedText}
                      className="h-7 text-[11px] font-semibold gap-1"
                      title="Highlight any text in the box and click to copy only that selection"
                    >
                      <Copy className="size-3" /> Copy Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyFullText(generatedResults.join("\n\n---\n\n"))}
                      className="h-7 text-[11px] font-bold text-primary gap-1"
                    >
                      <Check className="size-3" /> Copy All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadAsMarkdown(generatedResults.join("\n\n---\n\n"), topic)}
                      className="h-7 text-[11px] font-semibold gap-1"
                    >
                      <Download className="size-3" /> Export .md
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col">
                {isGenerating ? (
                  <div className="flex-1 grid place-items-center py-16 space-y-3 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center animate-bounce">
                      <Sparkles className="size-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Crafting with AI Intelligence...</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applying {tone.toLowerCase()} tone and {language} structure.
                      </p>
                    </div>
                  </div>
                ) : generatedResults.length === 0 ? (
                  <div className="flex-1 grid place-items-center py-16 text-center text-muted-foreground space-y-2">
                    <div className="size-12 rounded-2xl bg-muted grid place-items-center opacity-60">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">No Content Generated Yet</h4>
                      <p className="text-xs max-w-xs mt-1">
                        Choose a content type on the left, enter your topic, and click "Generate AI Content".
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    {generatedResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between border-b pb-2">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Result Variant {idx + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyFullText(result)}
                            className="h-6 text-[10px] gap-1 px-2 text-muted-foreground hover:text-primary"
                          >
                            <Copy className="size-3" /> Copy Variant
                          </Button>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                          {result}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MODAL: AI API KEY CONFIGURATION SETTINGS */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Key className="size-4 text-primary" /> AI Multi-Provider API Configuration
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter your API keys to power custom content generation directly in your workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Default AI Provider</label>
                <Select
                  value={apiSettings.provider}
                  onValueChange={(val) => setApiSettings({ ...apiSettings, provider: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (ChatGPT gpt-4o / gpt-4-turbo)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (gemini-1.5-pro)</SelectItem>
                    <SelectItem value="claude">Anthropic Claude (claude-3-5-sonnet)</SelectItem>
                    <SelectItem value="groq">Groq Cloud (Llama 3 70B / Mixtral)</SelectItem>
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
                    <Input
                      value={apiSettings.openaiModel}
                      onChange={(e) => setApiSettings({ ...apiSettings, openaiModel: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
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
                    <Input
                      value={apiSettings.geminiModel}
                      onChange={(e) => setApiSettings({ ...apiSettings, geminiModel: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
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
