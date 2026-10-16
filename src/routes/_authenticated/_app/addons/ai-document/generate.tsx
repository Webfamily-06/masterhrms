import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Sparkles, 
  RotateCw, 
  Save, 
  Copy, 
  Download, 
  FileText, 
  Check, 
  Sliders, 
  Layers,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { getAuthHeaders } from "@/lib/api";
import { PdfPreviewModal } from "@/components/ai/pdf-preview-modal";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-document/generate")({
  component: AiDocumentGeneratePage,
});

interface TemplateItem {
  id: string;
  title: string;
  categoryId: string;
  categoryName?: string;
  description: string;
}

interface ToneItem {
  id: string;
  name: string;
}

function AiDocumentGeneratePage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [tones, setTones] = useState<ToneItem[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form states
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [language, setLanguage] = useState<string>("English");
  const [selectedTone, setSelectedTone] = useState<string>("");
  const [creativity, setCreativity] = useState<number>(5);
  const [charLimit, setCharLimit] = useState<number>(2500);
  const [keywords, setKeywords] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");

  // Output states
  const [generating, setGenerating] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewingPdf, setPreviewingPdf] = useState(false);

  const handlePreviewPdf = async () => {
    if (!generatedContent) return;
    try {
      setPreviewingPdf(true);
      let docId = previewDocId;
      if (!docId) {
        const res = await fetch("/api/v1/addons/ai-document/documents", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: title || "Generated Document",
            content: generatedContent,
            templateId: selectedTemplate || undefined,
            toneId: selectedTone || undefined,
            language,
            creativity,
            keywords,
            instructions,
          }),
        });
        if (!res.ok) throw new Error("Failed to prepare document for preview");
        const data = await res.json();
        docId = data.document?.id || data.id;
        setPreviewDocId(docId);
      }
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to open PDF preview");
    } finally {
      setPreviewingPdf(false);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        setLoadingMeta(true);
        const [tplRes, toneRes] = await Promise.all([
          fetch("/api/v1/addons/ai-document/templates", { headers: getAuthHeaders() }),
          fetch("/api/v1/addons/ai-document/tones", { headers: getAuthHeaders() }),
        ]);
        if (tplRes.ok) {
          const tpls = await tplRes.json();
          const list = Array.isArray(tpls) ? tpls : tpls.templates || [];
          setTemplates(list);
          if (list.length > 0) {
            setSelectedTemplate(list[0].id);
          }
        }
        if (toneRes.ok) {
          const tns = await toneRes.json();
          const list = Array.isArray(tns) ? tns : tns.tones || [];
          setTones(list);
          if (list.length > 0) {
            setSelectedTone(list[0].id);
          }
        }
      } catch (err: any) {
        toast.error("Failed to load document templates or tones");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Document title is required");
      return;
    }

    try {
      setGenerating(true);
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);

      const res = await fetch("/api/v1/addons/ai-document/generate", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          title: title.trim(),
          language,
          toneId: selectedTone || undefined,
          creativity,
          charLimit,
          keywords: kwList,
          instructions: instructions.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedContent(data.content || "");
      toast.success("Document content generated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!generatedContent.trim()) {
      toast.error("No content to save");
      return;
    }

    try {
      setSavingDoc(true);
      const selectedTplObj = templates.find((t) => t.id === selectedTemplate);
      const selectedToneObj = tones.find((t) => t.id === selectedTone);
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);

      const res = await fetch("/api/v1/addons/ai-document/documents", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          templateId: selectedTemplate,
          templateName: selectedTplObj?.title || "Custom Template",
          title: title.trim() || "Generated Document",
          language,
          toneId: selectedTone,
          toneName: selectedToneObj?.name || "Professional",
          creativity,
          charLimit,
          keywords: kwList,
          instructions,
          content: generatedContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save document record");
      toast.success("Document saved to your History");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Content copied to clipboard");
  };

  const handleExport = (format: "txt" | "docx" | "pdf" | "md") => {
    const filename = `${(title || "document").replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}.${format}`;
    let mimeType = "text/plain;charset=utf-8";
    let blobContent: any = generatedContent;

    if (format === "docx") {
      mimeType = "application/msword;charset=utf-8";
      blobContent = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${title || "Document"}</title><style>body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; padding: 40px; } h1 { font-size: 20pt; color: #0f172a; margin-bottom: 12px; } p { margin-bottom: 10px; }</style></head><body><h1>${title || "Document"}</h1>${generatedContent.split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("")}</body></html>`;
    } else if (format === "pdf") {
      // Create print/PDF window for direct browser print-to-PDF or clean document stream
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${title || "Document"}</title><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; } h1 { font-size: 22px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 20px; } p { margin-bottom: 12px; white-space: pre-wrap; }</style></head><body><h1>${title || "Document"}</h1><div>${generatedContent.split("\n\n").map((p) => `<p>${p}</p>`).join("")}</div><script>window.onload = function() { window.print(); }<\/script></body></html>`);
        printWindow.document.close();
        toast.success("Print/PDF dialog opened");
        return;
      }
    }

    const blob = new Blob([blobContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as .${format}`);
  };

  const wordCount = generatedContent.trim() ? generatedContent.trim().split(/\s+/).length : 0;
  const charCount = generatedContent.length;

  return (
    <PlanGuard moduleName="AI Document" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <AiDocumentNavHeader activeTab="generate" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANEL: Generation Controls */}
          <div className="lg:col-span-5 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Sliders className="w-4 h-4 mr-2 text-primary" />
                  Generation Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure structure, tone, and focus keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Template Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prompt Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                            {tpl.title} ({tpl.categoryName || "General"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Document Title / Topic *</Label>
                    <Input
                      placeholder="e.g. Q4 Executive Strategy & Hybrid Work Policy"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>

                  {/* Language and Tone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish (Español)</SelectItem>
                          <SelectItem value="French">French (Français)</SelectItem>
                          <SelectItem value="German">German (Deutsch)</SelectItem>
                          <SelectItem value="Hindi">Hindi (हिंदी)</SelectItem>
                          <SelectItem value="Arabic">Arabic (العربية)</SelectItem>
                          <SelectItem value="Japanese">Japanese (日本語)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tone</Label>
                      <Select value={selectedTone} onValueChange={setSelectedTone}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {tones.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Creativity Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold">Creativity Level (1–10)</Label>
                      <span className="font-mono text-muted-foreground">{creativity} / 10</span>
                    </div>
                    <Slider
                      value={[creativity]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) => setCreativity(v[0])}
                    />
                  </div>

                  {/* Character Limit Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold">Length Limit (100–10,000)</Label>
                      <span className="font-mono text-muted-foreground">{charLimit} characters</span>
                    </div>
                    <Slider
                      value={[charLimit]}
                      min={100}
                      max={10000}
                      step={100}
                      onValueChange={(v) => setCharLimit(v[0])}
                    />
                  </div>

                  {/* Focus Keywords */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Focus Keywords (comma-separated)</Label>
                    <Input
                      placeholder="e.g. employee retention, performance, ROI"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Additional Instructions</Label>
                    <Textarea
                      rows={3}
                      placeholder="e.g. Add 3 actionable bullet recommendations at the end..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={generating}>
                    {generating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatedContent ? "Regenerate Content" : "Generate Document"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: Output Editor */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="h-full flex flex-col min-h-[580px]">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    Generated Output & Document Editor
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live word & character counters. Edit directly before saving or exporting.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {wordCount} words
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {charCount} chars
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-4 flex flex-col">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  placeholder="Generated document text will appear here. You can also type or paste markdown text directly..."
                  className="flex-1 min-h-[420px] font-sans text-xs leading-relaxed resize-none p-4"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t mt-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={!generatedContent}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("txt")}
                      disabled={!generatedContent}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      .txt
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("docx")}
                      disabled={!generatedContent}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      .docx
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handlePreviewPdf}
                      disabled={!generatedContent || previewingPdf}
                      className="gap-1.5"
                      data-testid="preview-pdf-generate-button"
                    >
                      {previewingPdf ? <RotateCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                      Preview PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("pdf")}
                      disabled={!generatedContent}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      .pdf
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDocument}
                    disabled={!generatedContent || savingDoc}
                    className="gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingDoc ? "Saving..." : "Save to History"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PdfPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentId={previewDocId || undefined}
        documentTitle={title || "Generated Document"}
      />
    </PlanGuard>
  );
}
