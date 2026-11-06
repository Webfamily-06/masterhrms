import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Type,
  Heading1,
  Heading2,
  User,
  Award,
  Calendar,
  PenTool,
  Shield,
  QrCode,
  Square,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Send,
  Eye,
  Layers,
  Sliders,
  Trash2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Loader2,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hr/organization/certificate-designer/$templateId")({
  component: CertificateDesignerPage,
});

export function CertificateDesignerPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [templateName, setTemplateName] = useState("");
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");
  const [zoom, setZoom] = useState(0.85);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Fetch Template
  const { data: templateData, isLoading } = useQuery({
    queryKey: ["certificate-template", templateId],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/certificate-studio/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load template.");
      return res.json();
    }
  });

  useEffect(() => {
    if (templateData?.template) {
      const tpl = templateData.template;
      setTemplateName(tpl.name || "Untitled Certificate");
      setOrientation(tpl.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE");

      const version = tpl.activeVersion || tpl.versions?.[0];
      const initialElements = version?.designJson?.elements || [];
      setElements(initialElements);
      setHistory([initialElements]);
      setHistoryIndex(0);
    }
  }, [templateData]);

  // History / Undo / Redo helpers
  const pushState = (newElements: any[]) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newElements);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setElements(newElements);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  // Canvas Dimensions
  const canvasWidth = orientation === "LANDSCAPE" ? 841.89 : 595.28;
  const canvasHeight = orientation === "LANDSCAPE" ? 595.28 : 841.89;

  // Element Manipulation
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const updateSelectedElement = (updates: Partial<any>) => {
    if (!selectedElementId) return;
    const nextElements = elements.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el));
    pushState(nextElements);
  };

  const addElement = (type: string, defaults: any = {}) => {
    const newId = `el-${type}-${Date.now().toString(36)}`;
    const newEl = {
      id: newId,
      type,
      name: defaults.name || type,
      x: defaults.x || canvasWidth / 2 - 100,
      y: defaults.y || canvasHeight / 2 - 25,
      width: defaults.width || 200,
      height: defaults.height || 40,
      fontFamily: defaults.fontFamily || "Inter",
      fontSize: defaults.fontSize || 14,
      color: defaults.color || "#1E3A8A",
      textAlign: defaults.textAlign || "center",
      zIndex: elements.length + 1,
      ...defaults
    };
    const next = [...elements, newEl];
    pushState(next);
    setSelectedElementId(newId);
  };

  const deleteElement = (id: string) => {
    const next = elements.filter((el) => el.id !== id);
    pushState(next);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Reorder Layers
  const moveLayer = (id: string, direction: "up" | "down") => {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx === -1) return;
    const newElements = [...elements];
    if (direction === "up" && idx < newElements.length - 1) {
      const temp = newElements[idx];
      newElements[idx] = newElements[idx + 1];
      newElements[idx + 1] = temp;
    } else if (direction === "down" && idx > 0) {
      const temp = newElements[idx];
      newElements[idx] = newElements[idx - 1];
      newElements[idx - 1] = temp;
    }
    pushState(newElements);
  };

  // Save Design Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const designJson = {
        canvas: {
          width: canvasWidth,
          height: canvasHeight,
          orientation,
          unit: "pt",
          backgroundColor: "#FFFFFF"
        },
        elements
      };

      const res = await fetch(`/api/certificate-studio/templates/${templateId}/save-design`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ designJson })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save design.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Certificate design saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["certificate-template", templateId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Publish Template Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/certificate-studio/templates/${templateId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to publish template.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template published and ready for award issuance!");
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-template", templateId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Preview PDF Generation
  const generatePreviewPdf = async () => {
    try {
      setIsPdfLoading(true);
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const designJson = {
        canvas: { width: canvasWidth, height: canvasHeight, orientation, backgroundColor: "#FFFFFF" },
        elements
      };

      const res = await fetch("/api/certificate-studio/templates/preview-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          designJson,
          sampleData: {
            name: "Alexander M. Vance",
            designation: "Principal Platform Architect",
            awardTitle: "Excellence in Enterprise Architecture",
            date: new Date().toISOString().split("T")[0]
          }
        })
      });

      if (!res.ok) throw new Error("Failed to render PDF preview.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading Certificate Designer Studio...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20">
      {/* Top Studio Action Bar */}
      <div className="h-14 border-b bg-background px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/hr/organization/certificate-templates" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Templates
          </Button>
          <div className="h-5 w-px bg-border" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 font-semibold text-sm w-64 bg-transparent border-transparent hover:border-input focus:border-input"
          />
        </div>

        {/* Center Controls (Zoom & Undo/Redo) */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="h-7 w-7 p-0">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-7 w-7 p-0"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="h-7 w-7 p-0">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono px-1 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="h-7 w-7 p-0">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Select
            value={orientation}
            onValueChange={(val: any) => {
              setOrientation(val);
              pushState(elements);
            }}
          >
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LANDSCAPE">Landscape A4</SelectItem>
              <SelectItem value="PORTRAIT">Portrait A4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generatePreviewPdf} disabled={isPdfLoading} className="h-8">
            {isPdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            Preview PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-8">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="h-8">
            <Send className="h-3.5 w-3.5 mr-1" />
            {publishMutation.isPending ? "Publishing..." : "Publish Template"}
          </Button>
        </div>
      </div>

      {/* Main Studio Body: 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Elements Library */}
        <div className="w-64 border-r bg-background p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Add Design Elements</h3>
            <p className="text-[11px] text-muted-foreground">Click element to place onto certificate canvas.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Typography</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() => addElement("text", { name: "Heading", text: "CERTIFICATE TITLE", fontSize: 24, fontFamily: "Cinzel", fontWeight: "bold" })}
              >
                <Heading1 className="h-3.5 w-3.5 mr-1.5 text-primary" /> Title
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() => addElement("text", { name: "Subheading", text: "This honor is presented to", fontSize: 13, fontStyle: "italic" })}
              >
                <Heading2 className="h-3.5 w-3.5 mr-1.5 text-primary" /> Subhead
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Dynamic Placeholders</p>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={() =>
                  addElement("text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Cinzel",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true
                  })
                }
              >
                <User className="h-3.5 w-3.5 mr-2 text-amber-500" /> Employee Name
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={() =>
                  addElement("text", {
                    name: "Award Title",
                    text: "{{award.title}}",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#1E3A8A"
                  })
                }
              >
                <Award className="h-3.5 w-3.5 mr-2 text-blue-600" /> Award Title
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9"
                onClick={() =>
                  addElement("text", {
                    name: "Award Date",
                    text: "Date: {{award.date}}",
                    fontSize: 10,
                    color: "#6B7280"
                  })
                }
              >
                <Calendar className="h-3.5 w-3.5 mr-2" /> Award Date
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Signatures & Authority</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() =>
                  addElement("signature", {
                    name: "HR Signature",
                    signatoryName: "Head of People & Culture",
                    width: 150,
                    height: 50
                  })
                }
              >
                <PenTool className="h-3.5 w-3.5 mr-1.5 text-primary" /> Signature
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() =>
                  addElement("seal", {
                    name: "Official Seal",
                    width: 60,
                    height: 60,
                    fill: "#D97706"
                  })
                }
              >
                <Shield className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Seal
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-9"
              onClick={() =>
                addElement("qrcode", {
                  name: "Verification QR",
                  width: 45,
                  height: 45
                })
              }
            >
              <QrCode className="h-3.5 w-3.5 mr-2 text-primary" /> Verification QR
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Shapes & Decorative</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Border Frame",
                    width: 250,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    fill: "transparent"
                  })
                }
              >
                <Square className="h-3.5 w-3.5 mr-1.5" /> Rectangle
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9"
                onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Divider Line",
                    width: 200,
                    height: 2,
                    fill: "#D97706"
                  })
                }
              >
                <Minus className="h-3.5 w-3.5 mr-1.5" /> Line
              </Button>
            </div>
          </div>
        </div>

        {/* CENTER CANVAS: WYSIWYG Page View */}
        <div className="flex-1 overflow-auto p-12 flex items-center justify-center bg-muted/40 relative">
          <div
            className="bg-white shadow-2xl relative transition-transform select-none border border-slate-200"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoom})`,
              transformOrigin: "center center"
            }}
            onClick={() => setSelectedElementId(null)}
          >
            {/* Safe Print Margins Guide */}
            <div className="absolute inset-6 border border-dashed border-slate-200 pointer-events-none" />

            {/* Render Canvas Elements */}
            {elements.map((el) => {
              const isSelected = el.id === selectedElementId;

              return (
                <div
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  className={`absolute transition-shadow cursor-move ${
                    isSelected ? "ring-2 ring-primary ring-offset-1 z-50 shadow-md" : "hover:ring-1 hover:ring-primary/40"
                  }`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    zIndex: el.zIndex || 10
                  }}
                >
                  {el.type === "text" && (
                    <div
                      className="w-full h-full flex items-center justify-center overflow-hidden"
                      style={{
                        fontFamily: el.fontFamily,
                        fontSize: `${el.fontSize}px`,
                        fontWeight: el.fontWeight || "normal",
                        fontStyle: el.fontStyle || "normal",
                        color: el.color || "#0F172A",
                        textAlign: el.textAlign || "center",
                        textDecoration: el.underline ? "underline" : "none"
                      }}
                    >
                      {el.text}
                    </div>
                  )}

                  {el.type === "shape" && (
                    <div
                      className="w-full h-full"
                      style={{
                        border: el.stroke ? `${el.strokeWidth || 1}px solid ${el.stroke}` : "none",
                        backgroundColor: el.fill || "transparent"
                      }}
                    />
                  )}

                  {el.type === "qrcode" && (
                    <div className="w-full h-full bg-white border border-slate-300 flex items-center justify-center p-1">
                      <QrCode className="w-full h-full text-slate-800" />
                    </div>
                  )}

                  {el.type === "seal" && (
                    <div
                      className="w-full h-full rounded-full border-2 flex flex-col items-center justify-center text-[7px] font-bold text-center uppercase"
                      style={{ borderColor: el.fill || "#D97706", color: el.fill || "#D97706" }}
                    >
                      <span>OFFICIAL</span>
                      <span>SEAL</span>
                    </div>
                  )}

                  {el.type === "signature" && (
                    <div className="w-full h-full flex flex-col items-center justify-end pb-1 border-b border-foreground/40">
                      <span className="text-[10px] font-semibold text-foreground/80">{el.signatoryName || "Authorized Signatory"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Properties Inspector & Layers */}
        <div className="w-80 border-l bg-background flex flex-col">
          <Tabs defaultValue="properties" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 rounded-none border-b h-11">
              <TabsTrigger value="properties" className="text-xs flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Properties
              </TabsTrigger>
              <TabsTrigger value="layers" className="text-xs flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Layers ({elements.length})
              </TabsTrigger>
            </TabsList>

            {/* Properties Inspector */}
            <TabsContent value="properties" className="p-4 flex-1 overflow-y-auto space-y-4">
              {selectedElement ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {selectedElement.type.toUpperCase()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteElement(selectedElement.id)}
                      className="text-destructive h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Coordinates & Sizing */}
                  <div className="space-y-2">
                    <Label className="text-xs">Dimensions & Position</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">X (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.x)}
                          onChange={(e) => updateSelectedElement({ x: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Y (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.y)}
                          onChange={(e) => updateSelectedElement({ y: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Width</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.width)}
                          onChange={(e) => updateSelectedElement({ width: parseFloat(e.target.value) || 10 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Height</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.height)}
                          onChange={(e) => updateSelectedElement({ height: parseFloat(e.target.value) || 10 })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Properties */}
                  {selectedElement.type === "text" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs">Typography</Label>
                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">Text Content</Label>
                        <Textarea
                          value={selectedElement.text}
                          onChange={(e) => updateSelectedElement({ text: e.target.value })}
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Font</Label>
                          <Select
                            value={selectedElement.fontFamily || "Inter"}
                            onValueChange={(val) => updateSelectedElement({ fontFamily: val })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cinzel">Cinzel (Formal Serif)</SelectItem>
                              <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                              <SelectItem value="Inter">Inter (Clean Sans)</SelectItem>
                              <SelectItem value="Montserrat">Montserrat</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Size</Label>
                          <Input
                            type="number"
                            value={selectedElement.fontSize || 14}
                            onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 12 })}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Color</Label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElement.color || "#0F172A"}
                              onChange={(e) => updateSelectedElement({ color: e.target.value })}
                              className="w-7 h-7 rounded border cursor-pointer"
                            />
                            <Input
                              value={selectedElement.color || "#0F172A"}
                              onChange={(e) => updateSelectedElement({ color: e.target.value })}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Alignment</Label>
                          <Select
                            value={selectedElement.textAlign || "center"}
                            onValueChange={(val) => updateSelectedElement({ textAlign: val })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shape Styling */}
                  {selectedElement.type === "shape" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs">Stroke & Fill</Label>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Stroke Color</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedElement.stroke || "#1E3A8A"}
                            onChange={(e) => updateSelectedElement({ stroke: e.target.value })}
                            className="w-7 h-7 rounded border cursor-pointer"
                          />
                          <Input
                            value={selectedElement.stroke || "#1E3A8A"}
                            onChange={(e) => updateSelectedElement({ stroke: e.target.value })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <Sliders className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs">No element selected</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Click any element on the canvas to inspect and customize properties.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Layers Panel */}
            <TabsContent value="layers" className="p-3 flex-1 overflow-y-auto space-y-1">
              {elements.map((el, idx) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border ${
                    el.id === selectedElementId ? "bg-primary/10 border-primary font-medium" : "hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{el.name || el.type}</span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(el.id, "up");
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(el.id, "down");
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(el.id);
                      }}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Preview PDF Dialog */}
      {previewPdfUrl && (
        <Dialog open={!!previewPdfUrl} onOpenChange={() => setPreviewPdfUrl(null)}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Authoritative PDF Vector Preview</DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden my-2">
              <iframe src={previewPdfUrl} className="w-full h-full border-0" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewPdfUrl(null)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

