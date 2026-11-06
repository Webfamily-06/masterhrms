import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Search,
  Filter,
  Eye,
  Copy,
  PenTool,
  Upload,
  Plus,
  Layers,
  CheckCircle2,
  FileCode,
  Image as ImageIcon,
  Loader2,
  Award,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hr/organization/certificate-templates")({
  component: CertificateTemplatesPage,
});

const CATEGORIES = [
  "All",
  "Employee Appreciation",
  "Employee Excellence",
  "Leadership & Performance",
  "Long Service Recognition",
  "Training & Development Completion",
  "Innovation & Special Recognition",
  "Team Achievement",
  "Corporate / Special Achievement"
];

function CertificateTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedOrientation, setSelectedOrientation] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  // Mode B Form
  const [htmlName, setHtmlName] = useState("");
  const [htmlCategory, setHtmlCategory] = useState("Employee Excellence");
  const [htmlContent, setHtmlContent] = useState("");
  const [cssContent, setCssContent] = useState("");

  // Mode C Form
  const [bgName, setBgName] = useState("");
  const [bgCategory, setBgCategory] = useState("Employee Excellence");
  const [bgFile, setBgFile] = useState<File | null>(null);

  // Fetch Templates
  const { data, isLoading } = useQuery({
    queryKey: ["certificate-templates", selectedCategory, selectedOrientation, searchQuery],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.append("category", selectedCategory);
      if (selectedOrientation !== "All") params.append("orientation", selectedOrientation);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/certificate-studio/templates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load templates.");
      return res.json();
    }
  });

  // Duplicate Template Mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/certificate-studio/templates/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to duplicate template.");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Template duplicated successfully!");
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      navigate({ to: `/hr/organization/certificate-designer/${data.template.id}` });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Import HTML Mutation
  const importHtmlMutation = useMutation({
    mutationFn: async () => {
      if (!htmlName || !htmlContent) throw new Error("Name and HTML content required.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/templates/import/html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: htmlName,
          category: htmlCategory,
          htmlContent,
          cssContent
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import HTML template.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("HTML template imported successfully!");
      setIsHtmlModalOpen(false);
      setHtmlName("");
      setHtmlContent("");
      setCssContent("");
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Import Background Mutation
  const importBgMutation = useMutation({
    mutationFn: async () => {
      if (!bgName || !bgFile) throw new Error("Name and artwork file required.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", bgFile);
      formData.append("name", bgName);
      formData.append("category", bgCategory);

      const res = await fetch("/api/certificate-studio/templates/import/background", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import background template.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Background certificate created!");
      setIsBgModalOpen(false);
      setBgName("");
      setBgFile(null);
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      navigate({ to: `/hr/organization/certificate-designer/${data.template.id}` });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const templates = data?.templates || [];
  const totalCount = data?.count || templates.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Enterprise Certificate Template Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Over 50 ready-made corporate designs across 8 categories, plus visual Canva-style customization and hybrid HTML/background imports.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsHtmlModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <FileCode className="h-3.5 w-3.5" /> Import HTML/CSS
          </Button>
          <Button variant="outline" onClick={() => setIsBgModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <ImageIcon className="h-3.5 w-3.5" /> Upload Background
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, tag, or style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="w-full sm:w-56">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select value={selectedOrientation} onValueChange={setSelectedOrientation}>
              <SelectTrigger>
                <SelectValue placeholder="Orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Formats</SelectItem>
                <SelectItem value="LANDSCAPE">Landscape (A4)</SelectItem>
                <SelectItem value="PORTRAIT">Portrait (A4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
            {totalCount} Designs
          </div>
        </div>
      </div>

      {/* Template Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading certificate templates library...
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center space-y-3 bg-muted/20">
          <Award className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-lg">No certificate templates found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Try adjusting your search query or category filters to explore the library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((tpl: any) => {
            const version = tpl.versions?.[0];
            const canvas = version?.designJson?.canvas || {};
            const isLandscape = tpl.orientation === "LANDSCAPE";

            return (
              <div
                key={tpl.id}
                className="group border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Visual Thumbnail Preview */}
                <div
                  className={`relative p-4 flex flex-col justify-between overflow-hidden cursor-pointer ${
                    isLandscape ? "h-48" : "h-64"
                  }`}
                  style={{
                    backgroundColor: canvas.backgroundColor || "#FFFFFF",
                    borderBottom: `2px solid ${canvas.primaryColor || "#E2E8F0"}`
                  }}
                  onClick={() => setPreviewTemplate(tpl)}
                >
                  {/* Decorative Frame */}
                  <div
                    className="absolute inset-2 border rounded pointer-events-none"
                    style={{ borderColor: canvas.secondaryColor || "#CBD5E1", borderWidth: 1 }}
                  />

                  {/* Header in Preview */}
                  <div className="relative z-10 text-center pt-2">
                    <p
                      className="text-[9px] font-bold tracking-widest uppercase truncate px-2"
                      style={{ color: canvas.primaryColor || "#1E3A8A" }}
                    >
                      {tpl.name}
                    </p>
                    <p className="text-[7px] text-muted-foreground italic mt-0.5">CERTIFICATE OF RECOGNITION</p>
                  </div>

                  {/* Center Mock Recipient */}
                  <div className="relative z-10 text-center my-auto">
                    <p
                      className="text-xs font-serif font-bold truncate px-3"
                      style={{ color: canvas.secondaryColor || "#D97706" }}
                    >
                      Alexander M. Vance
                    </p>
                    <p className="text-[7.5px] text-muted-foreground truncate px-2 mt-0.5">
                      For exemplary contributions & excellence
                    </p>
                  </div>

                  {/* Footer in Preview */}
                  <div className="relative z-10 flex items-center justify-between text-[7px] px-2 text-muted-foreground">
                    <span>Authorized Signature</span>
                    <span
                      className="w-4 h-4 rounded-full border flex items-center justify-center text-[5px]"
                      style={{ borderColor: canvas.secondaryColor || "#D97706" }}
                    >
                      SEAL
                    </span>
                  </div>

                  {/* Badges on top */}
                  <div className="absolute top-3 left-3 flex gap-1 z-20">
                    {tpl.isSystem ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-200">
                        SYSTEM
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-200">
                        CUSTOM
                      </span>
                    )}
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {tpl.orientation}
                    </span>
                  </div>
                </div>

                {/* Card Info & Actions */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary">{tpl.category}</p>
                    <h3 className="font-semibold text-sm line-clamp-1 mt-0.5" title={tpl.name}>
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tpl.description}</p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="flex-1 text-xs h-8"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>

                    {tpl.isSystem ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(tpl.id)}
                        disabled={duplicateMutation.isPending}
                        className="flex-1 text-xs h-8"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Customize
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate({ to: `/hr/organization/certificate-designer/${tpl.id}` })}
                        className="flex-1 text-xs h-8"
                      >
                        <PenTool className="h-3.5 w-3.5 mr-1" /> Edit Design
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl font-bold">{previewTemplate.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {previewTemplate.category} • {previewTemplate.orientation} • {previewTemplate.templateType}
                  </p>
                </div>
                {previewTemplate.isSystem && (
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-500/10 text-blue-600">
                    System Standard Template
                  </span>
                )}
              </div>
            </DialogHeader>

            {/* Interactive Preview Canvas */}
            <div className="border rounded-xl p-8 bg-muted/20 flex items-center justify-center overflow-auto my-2">
              <div
                className="shadow-xl rounded-lg p-8 relative flex flex-col justify-between"
                style={{
                  width: previewTemplate.orientation === "LANDSCAPE" ? 720 : 520,
                  height: previewTemplate.orientation === "LANDSCAPE" ? 509 : 720,
                  backgroundColor:
                    previewTemplate.versions?.[0]?.designJson?.canvas?.backgroundColor || "#FFFFFF",
                  border: `4px solid ${
                    previewTemplate.versions?.[0]?.designJson?.canvas?.primaryColor || "#1E3A8A"
                  }`
                }}
              >
                {/* Inner Gold Border */}
                <div
                  className="absolute inset-2 border pointer-events-none"
                  style={{
                    borderColor:
                      previewTemplate.versions?.[0]?.designJson?.canvas?.secondaryColor || "#D97706"
                  }}
                />

                {/* Top Section */}
                <div className="text-center relative z-10 pt-4">
                  <h3
                    className="text-lg font-bold tracking-widest uppercase"
                    style={{
                      color:
                        previewTemplate.versions?.[0]?.designJson?.canvas?.primaryColor || "#1E3A8A"
                    }}
                  >
                    MASTERHRMS GLOBAL TECHNOLOGIES
                  </h3>
                  <h2
                    className="text-2xl font-serif font-bold tracking-wider mt-2"
                    style={{
                      color:
                        previewTemplate.versions?.[0]?.designJson?.canvas?.primaryColor || "#1E3A8A"
                    }}
                  >
                    CERTIFICATE OF RECOGNITION
                  </h2>
                  <p className="text-xs text-muted-foreground italic mt-1">
                    This prestigious award is proudly conferred upon
                  </p>
                </div>

                {/* Center Recipient */}
                <div className="text-center relative z-10 my-auto">
                  <h1
                    className="text-3xl font-serif font-bold tracking-wide underline decoration-amber-500 underline-offset-8"
                    style={{
                      color:
                        previewTemplate.versions?.[0]?.designJson?.canvas?.secondaryColor || "#D97706"
                    }}
                  >
                    Johnathan E. Doe
                  </h1>
                  <p className="text-sm font-medium text-foreground mt-3">
                    for outstanding excellence and leadership as Principal Software Engineer
                  </p>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-2 leading-relaxed">
                    In recognition of sustained commitment, technical mastery, and exemplary teamwork that have
                    significantly contributed to the growth and success of the organization.
                  </p>
                </div>

                {/* Bottom Authority Section */}
                <div className="relative z-10 flex items-center justify-between px-6 pt-4 border-t border-muted/50">
                  <div className="text-center">
                    <div className="w-32 border-b border-foreground/40 mb-1" />
                    <p className="text-xs font-semibold">Head of People & Culture</p>
                    <p className="text-[10px] text-muted-foreground">Authorized HR Signatory</p>
                  </div>

                  <div className="w-14 h-14 rounded-full border-2 border-amber-500 flex items-center justify-center text-[8px] font-bold text-amber-600">
                    OFFICIAL SEAL
                  </div>

                  <div className="text-center">
                    <div className="w-32 border-b border-foreground/40 mb-1" />
                    <p className="text-xs font-semibold">Chief Executive Officer</p>
                    <p className="text-[10px] text-muted-foreground">Executive Leadership</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Close Preview
              </Button>
              {previewTemplate.isSystem ? (
                <Button
                  onClick={() => duplicateMutation.mutate(previewTemplate.id)}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> Customize This Template
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    navigate({ to: `/hr/organization/certificate-designer/${previewTemplate.id}` })
                  }
                >
                  <PenTool className="h-4 w-4 mr-1.5" /> Open in Designer
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mode B: HTML/CSS Import Modal */}
      <Dialog open={isHtmlModalOpen} onOpenChange={setIsHtmlModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              Import Custom HTML/CSS Certificate Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g. Enterprise Custom HTML Certificate"
                  value={htmlName}
                  onChange={(e) => setHtmlName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={htmlCategory} onValueChange={setHtmlCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>HTML Source (Strictly Sanitized: No Scripts/Iframes)</Label>
              <Textarea
                rows={6}
                placeholder="<div class='cert-box'><h1>{{organization.name}}</h1><h2>{{employee.name}}</h2></div>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>CSS Styles (Optional)</Label>
              <Textarea
                rows={4}
                placeholder=".cert-box { padding: 40px; text-align: center; border: 2px solid gold; }"
                value={cssContent}
                onChange={(e) => setCssContent(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHtmlModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => importHtmlMutation.mutate()}
              disabled={importHtmlMutation.isPending || !htmlName || !htmlContent}
            >
              {importHtmlMutation.isPending ? "Validating & Importing..." : "Validate & Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mode C: Background Import Modal */}
      <Dialog open={isBgModalOpen} onOpenChange={setIsBgModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Upload Certificate Background Artwork
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g. Canva Exported Gold Certificate"
                value={bgName}
                onChange={(e) => setBgName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={bgCategory} onValueChange={setBgCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Artwork File (PNG, JPEG, WEBP, PDF up to 5MB)</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => setBgFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBgModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => importBgMutation.mutate()}
              disabled={importBgMutation.isPending || !bgName || !bgFile}
            >
              {importBgMutation.isPending ? "Uploading..." : "Upload & Launch Designer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

