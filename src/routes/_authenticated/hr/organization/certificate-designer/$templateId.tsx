import React, { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Check,
  RefreshCw,
  Upload,
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
  Circle,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Send,
  Eye,
  EyeOff,
  Layers,
  Sliders,
  Trash2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ArrowLeft,
  Loader2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Maximize2,
  RotateCw,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import QRCode from "qrcode";
import { resolveClientCertificateVerificationUrl } from "@/lib/certificate-verification-resolver";
import { getCertificateAssetPreviewUrl } from "@/lib/certificate-asset-resolver";

export const Route = createFileRoute("/_authenticated/hr/organization/certificate-designer/$templateId")({
  component: CertificateDesignerPage,
});

// Curated fonts supported both in browser rendering and PDFKit vector output
const FONT_FAMILIES = [
  { value: "Inter", label: "Inter (Clean Sans)", category: "sans" },
  { value: "Public Sans", label: "Public Sans (Enterprise Sans)", category: "sans" },
  { value: "Arial", label: "Arial (Universal Sans)", category: "sans" },
  { value: "Helvetica", label: "Helvetica (Classic Sans)", category: "sans" },
  { value: "Montserrat", label: "Montserrat (Modern Sans)", category: "sans" },
  { value: "Roboto", label: "Roboto (Digital Sans)", category: "sans" },
  { value: "Lato", label: "Lato (Warm Sans)", category: "sans" },
  { value: "Playfair Display", label: "Playfair Display (Prestige Serif)", category: "serif" },
  { value: "Cinzel", label: "Cinzel (Formal Roman Serif)", category: "serif" },
  { value: "Georgia", label: "Georgia (Editorial Serif)", category: "serif" },
  { value: "Times New Roman", label: "Times New Roman (Traditional Serif)", category: "serif" },
  { value: "Merriweather", label: "Merriweather (Readable Serif)", category: "serif" },
  { value: "Libre Baskerville", label: "Libre Baskerville (Refined Serif)", category: "serif" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (Fine Serif)", category: "serif" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{employee.name}}": "Alexander M. Vance",
  "{{employee.employeeCode}}": "EMP-2026-0891",
  "{{employee.designation}}": "Principal Platform Architect",
  "{{employee.department}}": "Technology & Platform Operations",
  "{{award.title}}": "Governor Excellence Award 2026",
  "{{award.description}}": "For exceptional leadership, sustained engineering innovation, and organizational impact.",
  "{{award.date}}": new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }),
  "{{award.category}}": "Employee Excellence",
  "{{organization.name}}": "MASTERHRMS Global Technologies",
  "{{organization.logo}}": "/logo.webp",
  "{{certificate.number}}": "CERT-2026-8F29A10C",
  "{{certificate.verificationCode}}": "VERIFY-9C81B27D8310E476A841",
  "{{certificate.verificationUrl}}": resolveClientCertificateVerificationUrl("VERIFY-9C81B27D8310E476A841"),
};

interface AlignmentGuide {
  vertical?: number;
  horizontal?: number;
}

export function CertificateDesignerPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Document & Canvas State
  const [templateName, setTemplateName] = useState("");
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");
  const [zoom, setZoom] = useState(0.85);
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [previewSampleData, setPreviewSampleData] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("sample");
  const [selectedAwardId, setSelectedAwardId] = useState<string>("sample");
  const [customVerificationCode, setCustomVerificationCode] = useState<string>("VERIFY-9C81B27D8310E476A841");
  const [customCertNumber, setCustomCertNumber] = useState<string>("CERT-2026-8F29A10C");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const resolvedVerificationUrl = resolveClientCertificateVerificationUrl(customVerificationCode);

  // Live QR Code Generation from Centralized Verification URL
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(resolvedVerificationUrl, {
      margin: 1,
      width: 256,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" }
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn("[CertificateDesigner] Live QR generation failed:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [resolvedVerificationUrl]);

  const [clipboardElement, setClipboardElement] = useState<any | null>(null);
  const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [isReplaceLogoModalOpen, setIsReplaceLogoModalOpen] = useState(false);
  const [primaryLogoAsset, setPrimaryLogoAsset] = useState<any | null>(null);

  // History / Undo / Redo
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // PDF Preview Dialog
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Interaction State (Drag / Resize / Rotate)
  const [activeGuide, setActiveGuide] = useState<AlignmentGuide | null>(null);
  const [liveTransformText, setLiveTransformText] = useState<string | null>(null);

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const justFinishedInteractionRef = useRef<boolean>(false);
  const dragInteractionRef = useRef<{
    mode: "drag" | "resize" | "rotate" | null;
    elementId: string | null;
    handle?: string;
    startClientX: number;
    startClientY: number;
    startElX: number;
    startElY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
    centerX: number;
    centerY: number;
    aspectRatio: number;
    hasMoved: boolean;
  } | null>(null);

  // Canvas Dimensions in typographic points (A4 at 72dpi = 841.89 x 595.28)
  const canvasWidth = orientation === "LANDSCAPE" ? 841.89 : 595.28;
  const canvasHeight = orientation === "LANDSCAPE" ? 595.28 : 841.89;

  // Fetch Authorized Branding Assets & Primary Logo
  const { data: brandingData } = useQuery({
    queryKey: ["certificate-studio-branding-assets"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/branding", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { assets: [] };
      return res.json();
    }
  });

    // Fetch Authoritative Preview Context (Tenant Org, Branding Assets, Signatories, Employees, Awards)
  const { data: previewContextData } = useQuery({
    queryKey: ["certificate-studio-preview-context"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? (localStorage.getItem("hrms_auth_token") || localStorage.getItem("token")) : null;
      const res = await fetch("/api/certificate-studio/preview-context", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: primaryLogoData } = useQuery({
    queryKey: ["certificate-studio-primary-logo"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/branding/primary-logo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { primaryLogo: null };
      return res.json();
    }
  });

  // Computed Real-Time Preview Dictionary resolving tenant branding, employee, award, and signatories
  const computedData: Record<string, string> = React.useMemo(() => {
    const ctx = previewContextData?.context;
    const orgName = ctx?.organization?.name || "MASTERHRMS Global Technologies";
    const primaryLogoUrl = primaryLogoAsset?.url || ctx?.branding?.primaryLogo?.url || "/logo.webp";
    const sealUrl = ctx?.branding?.officialSeal?.url || "";

    // Selected Employee
    let empName = "Alexander M. Vance";
    let empCode = "EMP-2026-0891";
    let empDesig = "Principal Platform Architect";
    let empDept = "Technology & Platform Operations";

    if (selectedEmployeeId !== "sample" && ctx?.employees) {
      const found = ctx.employees.find((e: any) => e.id === selectedEmployeeId);
      if (found) {
        empName = found.name;
        empCode = found.employeeCode || "";
        empDesig = found.designation || "Staff Professional";
        empDept = found.department || "Operations";
      }
    }

    // Selected Award
    let awTitle = "Governor Excellence Award 2026";
    let awDesc = "For exceptional leadership, sustained engineering innovation, and organizational impact.";
    let awCat = "Employee Excellence";
    let awDate = new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });

    if (selectedAwardId !== "sample" && ctx?.awards) {
      const found = ctx.awards.find((a: any) => a.id === selectedAwardId);
      if (found) {
        awTitle = found.title;
        awDesc = found.description || "";
        awCat = found.category || "Distinction";
      }
    }

    // Signatories
    const hrSig = ctx?.signatoryRoles?.hr;
    const dirSig = ctx?.signatoryRoles?.director;
    const ceoSig = ctx?.signatoryRoles?.ceo;

    return {
      "{{organization.name}}": orgName,
      "{{organization.logo}}": primaryLogoUrl,
      "{{organization.seal}}": sealUrl,
      "{{employee.name}}": empName,
      "{{employee.employeeCode}}": empCode,
      "{{employee.designation}}": empDesig,
      "{{employee.department}}": empDept,
      "{{award.title}}": awTitle,
      "{{award.name}}": awTitle,
      "{{award.description}}": awDesc,
      "{{award.category}}": awCat,
      "{{award.date}}": awDate,
      "{{certificate.number}}": customCertNumber,
      "{{certificate.verificationCode}}": customVerificationCode,
      "{{certificate.verificationUrl}}": resolvedVerificationUrl,
      "{{signatures.hr}}": hrSig?.name || "Sarah Jenkins",
      "{{signatures.director}}": dirSig?.name || "Managing Director",
      "{{signatures.ceo}}": ceoSig?.name || "Chief Executive Officer",
      "{{signatures.hr.name}}": hrSig?.name || "Sarah Jenkins",
      "{{signatures.hr.title}}": hrSig?.designation || "Director of People & Culture",
      "{{signatures.director.name}}": dirSig?.name || "Managing Director",
      "{{signatures.director.title}}": dirSig?.designation || "Managing Director",
      "{{signatures.ceo.name}}": ceoSig?.name || "Marcus Sterling",
      "{{signatures.ceo.title}}": ceoSig?.designation || "Chief Executive Officer",
      hrSignatureUrl: hrSig?.signatureUrl || "",
      directorSignatureUrl: dirSig?.signatureUrl || "",
      ceoSignatureUrl: ceoSig?.signatureUrl || "",
      officialSealUrl: sealUrl,
      primaryLogoUrl,
    };
  }, [previewContextData, primaryLogoAsset, selectedEmployeeId, selectedAwardId, customCertNumber, customVerificationCode, resolvedVerificationUrl]);

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
      const resolvedLogoUrl = primaryLogoData?.primaryLogo?.url || primaryLogoData?.primaryLogo?.storagePath || "/logo.webp";
      const initialElements = (version?.designJson?.elements || []).map((el: any, idx: number) => {
        let updatedUrl = el.url;
        // Auto-resolve primary logo if unbound or placeholder
        if ((el.type === "logo" || el.isLogo) && (!el.url || el.url === "{{organization.logo}}" || el.url === "/logo.webp")) {
          if (primaryLogoData?.primaryLogo) {
            updatedUrl = getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) || primaryLogoData.primaryLogo.url;
          }
        }
        return {
          ...el,
          url: updatedUrl,
          zIndex: el.zIndex !== undefined ? el.zIndex : idx + 1
        };
      });
      setElements(initialElements);
      setHistory([JSON.parse(JSON.stringify(initialElements))]);
      setHistoryIndex(0);
    }
  }, [templateData, primaryLogoData]);

  // History Helper - only push completed logical actions
  const pushState = useCallback((newElements: any[]) => {
    const updated = history.slice(0, historyIndex + 1);
    const cloned = JSON.parse(JSON.stringify(newElements));
    updated.push(cloned);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setElements(cloned);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(prev)));
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(next)));
    }
  }, [history, historyIndex]);

  // Selected Element
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Property update helper
  const updateSelectedElement = (updates: Partial<any>) => {
    if (!selectedElementId) return;
    const nextElements = elements.map((el) =>
      el.id === selectedElementId ? { ...el, ...updates } : el
    );
    pushState(nextElements);
  };

  // Left Panel Drag-and-Drop Handler
  const handleDragStartFromPanel = (e: React.DragEvent, type: string, defaults: any = {}) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type, defaults }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const { type, defaults } = JSON.parse(raw);
      const docPt = getDocPoint(e.clientX, e.clientY);
      const dropDefaults = {
        ...defaults,
        x: Math.round(docPt.x - (defaults.width || 200) / 2),
        y: Math.round(docPt.y - (defaults.height || 40) / 2)
      };
      // Keep inside document boundaries
      dropDefaults.x = Math.max(10, Math.min(canvasWidth - (defaults.width || 200) - 10, dropDefaults.x));
      dropDefaults.y = Math.max(10, Math.min(canvasHeight - (defaults.height || 40) - 10, dropDefaults.y));
      addElement(type, dropDefaults);
      toast.success(`Added ${defaults.name || type} to canvas`);
    } catch (err) {
      console.error("Failed to parse dropped element:", err);
    }
  };

  // Alignment & Distribution Helpers
  const alignSelectedElements = (action: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el => {
        if (el.id !== selectedElementId) return el;
        let x = el.x;
        let y = el.y;
        if (action === "left") x = 20;
        if (action === "center") x = Math.round((canvasWidth - el.width) / 2);
        if (action === "right") x = canvasWidth - el.width - 20;
        if (action === "top") y = 20;
        if (action === "middle") y = Math.round((canvasHeight - el.height) / 2);
        if (action === "bottom") y = canvasHeight - el.height - 20;
        return { ...el, x, y };
      });
      pushState(next);
      return next;
    });
  };

  // Add Element
  const addElement = (type: string, defaults: any = {}) => {
    const newId = `el-${type}-${Date.now().toString(36)}`;
    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
    const newEl = {
      id: newId,
      type,
      name: defaults.name || type.charAt(0).toUpperCase() + type.slice(1),
      x: defaults.x ?? Math.round(canvasWidth / 2 - (defaults.width || 200) / 2),
      y: defaults.y ?? Math.round(canvasHeight / 2 - (defaults.height || 40) / 2),
      width: defaults.width || 200,
      height: defaults.height || 40,
      rotation: 0,
      opacity: 1,
      fontFamily: defaults.fontFamily || "Inter",
      fontSize: defaults.fontSize || 14,
      fontWeight: defaults.fontWeight || "normal",
      fontStyle: defaults.fontStyle || "normal",
      color: defaults.color || "#1E3A8A",
      textAlign: defaults.textAlign || "center",
      zIndex: maxZ + 1,
      locked: false,
      hidden: false,
      ...defaults
    };
    const next = [...elements, newEl];
    pushState(next);
    setSelectedElementId(newId);
  };

  const deleteElement = useCallback((id: string) => {
    const next = elements.filter((el) => el.id !== id);
    pushState(next);
    if (selectedElementId === id) setSelectedElementId(null);
  }, [elements, selectedElementId, pushState]);

  const duplicateElement = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const maxZ = elements.reduce((max, e) => Math.max(max, e.zIndex || 0), 0);
    const newId = `el-${el.type}-${Date.now().toString(36)}`;
    const cloned = {
      ...JSON.parse(JSON.stringify(el)),
      id: newId,
      name: `${el.name} (Copy)`,
      x: Math.min(canvasWidth - el.width, el.x + 15),
      y: Math.min(canvasHeight - el.height, el.y + 15),
      zIndex: maxZ + 1,
      locked: false
    };
    const next = [...elements, cloned];
    pushState(next);
    setSelectedElementId(newId);
    toast.success("Element duplicated");
  }, [elements, canvasWidth, canvasHeight, pushState]);

  // Layer Ordering Operations
  const reorderLayer = (id: string, action: "bringToFront" | "bringForward" | "sendBackward" | "sendToBack") => {
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;
    const newElements = [...elements];
    const target = newElements[index];

    if (action === "bringToFront") {
      newElements.splice(index, 1);
      newElements.push(target);
    } else if (action === "sendToBack") {
      newElements.splice(index, 1);
      newElements.unshift(target);
    } else if (action === "bringForward" && index < newElements.length - 1) {
      newElements[index] = newElements[index + 1];
      newElements[index + 1] = target;
    } else if (action === "sendBackward" && index > 0) {
      newElements[index] = newElements[index - 1];
      newElements[index - 1] = target;
    }

    // Re-index zIndex continuously
    const reindexed = newElements.map((el, i) => ({ ...el, zIndex: i + 1 }));
    pushState(reindexed);
  };

  const toggleLock = (id: string) => {
    const next = elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el));
    pushState(next);
  };

  const toggleVisibility = (id: string) => {
    const next = elements.map((el) => (el.id === id ? { ...el, hidden: !el.hidden } : el));
    pushState(next);
  };

  // Canvas Viewport Fit Helper
  const fitToViewport = (overrideWidth?: number, overrideHeight?: number) => {
    if (!canvasContainerRef.current) return;
    const { clientWidth, clientHeight } = canvasContainerRef.current;
    const targetW = overrideWidth || canvasWidth;
    const targetH = overrideHeight || canvasHeight;
    const scaleX = (clientWidth - 80) / targetW;
    const scaleY = (clientHeight - 80) / targetH;
    const fitZoom = Math.min(scaleX, scaleY);
    setZoom(Math.max(0.3, Math.min(1.2, parseFloat(fitZoom.toFixed(2)))));
  };

  // Canonical Orientation Conversion (Proportional Coordinate & Dimension Transformation)
  const convertLayoutOrientation = (
    from: "LANDSCAPE" | "PORTRAIT",
    to: "LANDSCAPE" | "PORTRAIT",
    sourceElements: any[]
  ) => {
    if (from === to) return sourceElements;
    const oldW = from === "LANDSCAPE" ? 841.89 : 595.28;
    const oldH = from === "LANDSCAPE" ? 595.28 : 841.89;
    const newW = to === "LANDSCAPE" ? 841.89 : 595.28;
    const newH = to === "LANDSCAPE" ? 595.28 : 841.89;

    const scaleX = newW / oldW;
    const scaleY = newH / oldH;

    return sourceElements.map((el) => {
      // 1. Full-page Decorative Borders and Background Frames
      const isFrame =
        el.name?.toLowerCase().includes("border") ||
        el.name?.toLowerCase().includes("frame") ||
        el.name?.toLowerCase().includes("background") ||
        (el.width >= oldW - 80 && el.height >= oldH - 80);

      if (isFrame) {
        const mLeft = el.x;
        const mRight = oldW - (el.x + el.width);
        const mTop = el.y;
        const mBottom = oldH - (el.y + el.height);

        // Symmetric margins preserved
        if (Math.abs(mLeft - mRight) < 20 && Math.abs(mTop - mBottom) < 20) {
          const newX = el.x;
          const newY = el.y;
          const width = Math.round((newW - 2 * newX) * 100) / 100;
          const height = Math.round((newH - 2 * newY) * 100) / 100;
          return { ...el, x: newX, y: newY, width, height };
        }
      }

      // 2. Aspect-Ratio Locked Elements (Seals, QR, Signatures, Logos, Images, Circles)
      const isAspectLocked =
        el.type === "seal" ||
        el.type === "qrcode" ||
        el.type === "signature" ||
        el.type === "logo" ||
        el.type === "image" ||
        el.shapeType === "circle";

      if (isAspectLocked) {
        const xRatio = el.x / oldW;
        const yRatio = el.y / oldH;
        const uniformScale = to === "PORTRAIT" ? Math.min(scaleX, 0.88) : Math.min(scaleY, 1.15);
        const width = Math.round(el.width * uniformScale * 100) / 100;
        const height = Math.round(el.height * uniformScale * 100) / 100;
        let x = Math.round(xRatio * newW * 100) / 100;
        let y = Math.round(yRatio * newH * 100) / 100;

        const oldCenterX = el.x + el.width / 2;
        if (Math.abs(oldCenterX - oldW / 2) < 25) {
          x = Math.round(((newW - width) / 2) * 100) / 100;
        }
        x = Math.max(10, Math.min(newW - width - 10, x));
        y = Math.max(10, Math.min(newH - height - 10, y));
        return { ...el, x, y, width, height };
      }

      // 3. Horizontal Divider Lines
      if (el.type === "shape" && (el.shapeType === "line" || el.height <= 3)) {
        const yRatio = el.y / oldH;
        const y = Math.round(yRatio * newH * 100) / 100;
        const width = Math.round(el.width * scaleX * 100) / 100;
        let x = Math.round(el.x * scaleX * 100) / 100;
        const oldCenterX = el.x + el.width / 2;
        if (Math.abs(oldCenterX - oldW / 2) < 25) {
          x = Math.round(((newW - width) / 2) * 100) / 100;
        }
        return { ...el, x, y, width, height: el.height };
      }

      // 4. Text Elements
      if (el.type === "text") {
        const xRatio = el.x / oldW;
        const yRatio = el.y / oldH;
        let y = Math.round(yRatio * newH * 100) / 100;
        let width = Math.round(el.width * scaleX * 100) / 100;
        if (width > newW - 40) width = newW - 40;
        let x = Math.round(xRatio * newW * 100) / 100;

        const oldCenterX = el.x + el.width / 2;
        if (Math.abs(oldCenterX - oldW / 2) < 30) {
          x = Math.round(((newW - width) / 2) * 100) / 100;
        }
        x = Math.max(15, Math.min(newW - width - 15, x));
        const height =
          to === "PORTRAIT"
            ? Math.round(Math.max(el.height, el.height * 1.25) * 100) / 100
            : Math.round(Math.max(20, el.height * 0.8) * 100) / 100;

        return { ...el, x, y, width, height };
      }

      // 5. Default Generic Shapes / Containers
      let width = Math.round(el.width * scaleX * 100) / 100;
      let height = Math.round(el.height * scaleY * 100) / 100;
      let x = Math.round((el.x / oldW) * newW * 100) / 100;
      let y = Math.round((el.y / oldH) * newH * 100) / 100;
      x = Math.max(10, Math.min(newW - width - 10, x));
      y = Math.max(10, Math.min(newH - height - 10, y));
      return { ...el, x, y, width, height };
    });
  };

  // Convert Screen/Pointer coordinates to Certificate Document Points (pt)
  const getDocPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  // --------------------------------------------------------------------------
  // POINTER INTERACTION HANDLERS: DRAGGING, RESIZING, ROTATING
  // --------------------------------------------------------------------------
  const handlePointerDownElement = (e: React.PointerEvent, el: any) => {
    if (el.hidden) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    if (el.locked) {
      return;
    }

    const docPt = getDocPoint(e.clientX, e.clientY);
    dragInteractionRef.current = {
      mode: "drag",
      elementId: el.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startWidth: el.width,
      startHeight: el.height,
      startRotation: el.rotation || 0,
      centerX: el.x + el.width / 2,
      centerY: el.y + el.height / 2,
      aspectRatio: el.width / (el.height || 1),
      hasMoved: false
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
  };

  const handlePointerDownHandle = (e: React.PointerEvent, handle: string, el: any) => {
    e.stopPropagation();
    const docPt = getDocPoint(e.clientX, e.clientY);
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;

    dragInteractionRef.current = {
      mode: handle === "rot" ? "rotate" : "resize",
      elementId: el.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startWidth: el.width,
      startHeight: el.height,
      startRotation: el.rotation || 0,
      centerX,
      centerY,
      aspectRatio: el.width / (el.height || 1),
      hasMoved: false
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
  };

  const handleGlobalPointerMove = (e: PointerEvent) => {
    const interaction = dragInteractionRef.current;
    if (!interaction || !interaction.elementId) return;

    interaction.hasMoved = true;
    const dx = (e.clientX - interaction.startClientX) / zoom;
    const dy = (e.clientY - interaction.startClientY) / zoom;

    setElements((prevElements) => {
      return prevElements.map((el) => {
        if (el.id !== interaction.elementId) return el;

        if (interaction.mode === "drag") {
          let newX = interaction.startElX + dx;
          let newY = interaction.startElY + dy;

          // Alignment Snapping & Guides
          const SNAP_THRESHOLD = 5;
          const guides: AlignmentGuide = {};

          // Snap to canvas center
          const centerX = newX + el.width / 2;
          const centerY = newY + el.height / 2;
          if (Math.abs(centerX - canvasWidth / 2) < SNAP_THRESHOLD) {
            newX = canvasWidth / 2 - el.width / 2;
            guides.vertical = canvasWidth / 2;
          }
          if (Math.abs(centerY - canvasHeight / 2) < SNAP_THRESHOLD) {
            newY = canvasHeight / 2 - el.height / 2;
            guides.horizontal = canvasHeight / 2;
          }

          // Snap to canvas safe margins (24pt)
          if (Math.abs(newX - 24) < SNAP_THRESHOLD) {
            newX = 24;
            guides.vertical = 24;
          }
          if (Math.abs(newX + el.width - (canvasWidth - 24)) < SNAP_THRESHOLD) {
            newX = canvasWidth - 24 - el.width;
            guides.vertical = canvasWidth - 24;
          }

          setActiveGuide(Object.keys(guides).length ? guides : null);
          setLiveTransformText(`X: ${Math.round(newX)} pt, Y: ${Math.round(newY)} pt`);

          return { ...el, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 };
        }

        if (interaction.mode === "resize") {
          const handle = interaction.handle || "se";
          const keepRatio = e.shiftKey || el.type === "seal" || el.type === "qrcode" || el.type === "logo" || el.type === "image" || el.aspectRatioLocked;
          let { startElX: x, startElY: y, startWidth: w, startHeight: h, aspectRatio: ratio } = interaction;

          let newX = x;
          let newY = y;
          let newW = w;
          let newH = h;

          if (handle.includes("e")) newW = Math.max(12, w + dx);
          if (handle.includes("s")) newH = Math.max(6, h + dy);
          if (handle.includes("w")) {
            const potentialW = Math.max(12, w - dx);
            newX = x + (w - potentialW);
            newW = potentialW;
          }
          if (handle.includes("n")) {
            const potentialH = Math.max(6, h - dy);
            newY = y + (h - potentialH);
            newH = potentialH;
          }

          if (keepRatio && ratio > 0) {
            if (handle === "e" || handle === "w") {
              newH = newW / ratio;
            } else {
              newW = newH * ratio;
            }
          }

          setLiveTransformText(`W: ${Math.round(newW)} pt × H: ${Math.round(newH)} pt`);
          return {
            ...el,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
            width: Math.round(newW * 10) / 10,
            height: Math.round(newH * 10) / 10
          };
        }

        if (interaction.mode === "rotate") {
          const docPt = getDocPoint(e.clientX, e.clientY);
          const rad = Math.atan2(docPt.y - interaction.centerY, docPt.x - interaction.centerX);
          let deg = Math.round((rad * 180) / Math.PI) + 90;
          if (deg < 0) deg += 360;

          // Snap to 0, 45, 90, 180, 270
          if (Math.abs(deg - 0) < 4 || Math.abs(deg - 360) < 4) deg = 0;
          else if (Math.abs(deg - 45) < 4) deg = 45;
          else if (Math.abs(deg - 90) < 4) deg = 90;
          else if (Math.abs(deg - 180) < 4) deg = 180;
          else if (Math.abs(deg - 270) < 4) deg = 270;

          setLiveTransformText(`Rotation: ${deg}°`);
          return { ...el, rotation: deg };
        }

        return el;
      });
    });
  };

  const handleGlobalPointerUp = () => {
    window.removeEventListener("pointermove", handleGlobalPointerMove);
    window.removeEventListener("pointerup", handleGlobalPointerUp);

    const interaction = dragInteractionRef.current;
    if (interaction && interaction.hasMoved) {
      justFinishedInteractionRef.current = true;
      const preventClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        window.removeEventListener("click", preventClick, true);
      };
      window.addEventListener("click", preventClick, true);
      setTimeout(() => {
        justFinishedInteractionRef.current = false;
        window.removeEventListener("click", preventClick, true);
      }, 300);
      setElements((latest) => {
        const updated = history.slice(0, historyIndex + 1);
        const cloned = JSON.parse(JSON.stringify(latest));
        updated.push(cloned);
        setHistory(updated);
        setHistoryIndex(updated.length - 1);
        return latest;
      });
    }

    dragInteractionRef.current = null;
    setActiveGuide(null);
    setLiveTransformText(null);
  };

  // --------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS (Delete, Duplicate, Copy, Paste, Undo, Redo, Nudge, Esc)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never capture while typing inside text inputs, textareas, or selects
      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedElement) {
        e.preventDefault();
        setClipboardElement(JSON.parse(JSON.stringify(selectedElement)));
        toast.info("Element copied to clipboard");
        return;
      }

      // Paste: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && clipboardElement) {
        e.preventDefault();
        const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
        const newId = `el-${clipboardElement.type}-${Date.now().toString(36)}`;
        const pasted = {
          ...JSON.parse(JSON.stringify(clipboardElement)),
          id: newId,
          name: `${clipboardElement.name} (Pasted)`,
          x: Math.min(canvasWidth - clipboardElement.width, clipboardElement.x + 20),
          y: Math.min(canvasHeight - clipboardElement.height, clipboardElement.y + 20),
          zIndex: maxZ + 1,
          locked: false
        };
        const next = [...elements, pasted];
        pushState(next);
        setSelectedElementId(newId);
        toast.success("Element pasted");
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedElementId) {
        e.preventDefault();
        duplicateElement(selectedElementId);
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId && !selectedElement?.locked) {
        e.preventDefault();
        deleteElement(selectedElementId);
        return;
      }

      // Deselect: Escape
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedElementId(null);
        return;
      }

      // Nudge with Arrow Keys (1pt or 10pt with Shift)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedElementId && !selectedElement?.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;

        const next = elements.map((el) => {
          if (el.id !== selectedElementId) return el;
          return {
            ...el,
            x: Math.round(Math.max(0, Math.min(canvasWidth - el.width, el.x + dx))),
            y: Math.round(Math.max(0, Math.min(canvasHeight - el.height, el.y + dy)))
          };
        });
        pushState(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, selectedElementId, clipboardElement, elements, canvasWidth, canvasHeight, pushState, deleteElement, duplicateElement, handleUndo, handleRedo]);

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
            name: computedData["{{employee.name}}"],
            code: computedData["{{employee.employeeCode}}"],
            designation: computedData["{{employee.designation}}"],
            department: computedData["{{employee.department}}"],
            awardTitle: computedData["{{award.title}}"],
            awardDescription: computedData["{{award.description}}"],
            category: computedData["{{award.category}}"],
            date: computedData["{{award.date}}"],
            orgName: computedData["{{organization.name}}"],
            certificateNumber: computedData["{{certificate.number}}"],
            verificationCode: computedData["{{certificate.verificationCode}}"],
            verificationUrl: computedData["{{certificate.verificationUrl}}"],
            logoUrl: computedData.primaryLogoUrl,
            sealUrl: computedData.officialSealUrl,
            hrSignatureUrl: computedData.hrSignatureUrl,
            directorSignatureUrl: computedData.directorSignatureUrl,
            ceoSignatureUrl: computedData.ceoSignatureUrl
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

  const resolveDisplayText = (rawText: string) => {
    if (!previewSampleData || !rawText) return rawText;
    let res = rawText;
    Object.entries(computedData).forEach(([token, val]) => {
      if (token.startsWith("{{") && typeof val === "string") {
        const replacement = val.trim() !== "" ? val : `[${token.replace(/[{}]/g, "")}]`;
        res = res.split(token).join(replacement);
      }
    });
    return res;
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20 select-none">
      {/* ── Top Studio Action Bar ── */}
      <div className="h-14 border-b bg-background px-4 flex items-center justify-between gap-4 shrink-0 z-20">
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

        {/* Center Controls (Zoom, Fit, Preview Toggle & Undo/Redo) */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="h-7 w-7 p-0"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="h-7 w-7 p-0"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} title="Zoom Out" className="h-7 w-7 p-0">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono px-1 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} title="Zoom In" className="h-7 w-7 p-0">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(1.0)} title="100% Actual Size" className="h-7 px-2 text-xs">
            100%
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fitToViewport()} title="Fit Canvas to Screen" className="h-7 px-2 text-xs flex items-center gap-1">
            <Maximize2 className="h-3 w-3" /> Fit
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant={previewSampleData ? "default" : "ghost"}
            size="sm"
            onClick={() => setPreviewSampleData(!previewSampleData)}
            title="Toggle Realistic Sample Preview vs Raw {{placeholders}}"
            className="h-7 px-2 text-xs flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {previewSampleData ? "Sample Data" : "Tokens"}
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Select
            value={orientation}
            onValueChange={(val: "LANDSCAPE" | "PORTRAIT") => {
              if (val === orientation) return;
              const converted = convertLayoutOrientation(orientation, val, elements);
              const targetW = val === "LANDSCAPE" ? 841.89 : 595.28;
              const targetH = val === "LANDSCAPE" ? 595.28 : 841.89;
              setOrientation(val);
              pushState(converted);
              fitToViewport(targetW, targetH);
              toast.info(`Layout converted to ${val === "PORTRAIT" ? "Portrait A4" : "Landscape A4"}`);
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

        {/* Right Action Buttons */}
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

      {/* ── Real-Time Dynamic Preview Context Bar ── */}
      <div className="h-10 border-b bg-muted/40 px-4 flex items-center justify-between text-xs gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Preview Context:</span>
          </div>

          {/* Employee Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">Employee:</span>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="h-7 text-xs w-44 bg-background">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample">Alexander Vance (Sample)</SelectItem>
                {(previewContextData?.context?.employees || []).map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Award Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">Award:</span>
            <Select value={selectedAwardId} onValueChange={setSelectedAwardId}>
              <SelectTrigger className="h-7 text-xs w-44 bg-background">
                <SelectValue placeholder="Select Award" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample">Governor Excellence (Sample)</SelectItem>
                {(previewContextData?.context?.awards || []).map((aw: any) => (
                  <SelectItem key={aw.id} value={aw.id}>
                    {aw.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Verification Code */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">Verification:</span>
            <Input
              value={customVerificationCode}
              onChange={(e) => setCustomVerificationCode(e.target.value)}
              className="h-7 text-xs w-36 font-mono bg-background"
              placeholder="VERIFY-CODE"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden lg:inline truncate max-w-[200px]" title={resolvedVerificationUrl}>
            {resolvedVerificationUrl}
          </span>
          
        </div>
      </div>

      {/* ── Main Studio Body: 3-Panel Architecture ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Insert Elements Library */}
        <div className="w-64 border-r bg-background p-4 flex flex-col gap-4 overflow-y-auto shrink-0 z-10">
          <div className="space-y-1">
            <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Add Design Elements</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">Click any element to place it onto the certificate canvas.</p>
          </div>

          {/* Typography */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Typography</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("text", {
                    name: "Certificate Header",
                    text: "CERTIFICATE OF RECOGNITION",
                    fontSize: 24,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    width: 420,
                    height: 40
                  })
                }
              >
                <Heading1 className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />
                <span className="truncate min-w-0">Title</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("text", {
                    name: "Subheading Citation",
                    text: "This honor is proudly conferred upon",
                    fontSize: 12,
                    fontStyle: "italic",
                    fontFamily: "Georgia",
                    width: 350,
                    height: 25
                  })
                }
              >
                <Heading2 className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />
                <span className="truncate min-w-0">Subhead</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("text", {
                    name: "Body Text / Description",
                    text: "For outstanding performance, sustained innovation, and exemplary commitment to excellence.",
                    fontSize: 11,
                    fontFamily: "Inter",
                    width: 450,
                    height: 45,
                    lineHeight: 1.4
                  })
                }
              >
                <Type className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                <span className="truncate min-w-0">Body Text</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("text", {
                    name: "Custom Citation",
                    text: "Special Commendation & Recognition",
                    fontSize: 13,
                    fontFamily: "Public Sans",
                    fontWeight: "medium",
                    width: 300,
                    height: 30
                  })
                }
              >
                <Type className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />
                <span className="truncate min-w-0">Custom Text</span>
              </Button>
            </div>
          </div>

          {/* Dynamic Placeholders */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Dynamic Placeholders</p>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground font-medium"
                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true,
                    width: 400,
                    height: 45
                  })
                }
                onClick={() =>
                  addElement("text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true,
                    width: 400,
                    height: 45
                  })
                }
              >
                <User className="h-3.5 w-3.5 mr-2 text-amber-500" /> Employee Name
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground font-medium"
                onClick={() =>
                  addElement("text", {
                    name: "Employee Designation",
                    text: "{{employee.designation}}",
                    fontSize: 12,
                    fontFamily: "Inter",
                    fontWeight: "medium",
                    color: "#475569",
                    width: 320,
                    height: 25
                  })
                }
              >
                <User className="h-3.5 w-3.5 mr-2 text-slate-500" /> Employee Designation
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground font-medium"
                onClick={() =>
                  addElement("text", {
                    name: "Award Title",
                    text: "{{award.title}}",
                    fontSize: 14,
                    fontFamily: "Georgia",
                    fontWeight: "bold",
                    color: "#1E3A8A",
                    width: 360,
                    height: 30
                  })
                }
              >
                <Award className="h-3.5 w-3.5 mr-2 text-blue-600" /> Award Title
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() =>
                  addElement("text", {
                    name: "Award Date",
                    text: "Conferred this {{award.date}}",
                    fontSize: 10,
                    fontFamily: "Inter",
                    color: "#6B7280",
                    width: 250,
                    height: 20
                  })
                }
              >
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Award Date
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() =>
                  addElement("text", {
                    name: "Organization Name",
                    text: "{{organization.name}}",
                    fontSize: 16,
                    fontFamily: "Cinzel",
                    fontWeight: "bold",
                    color: "#0F172A",
                    width: 350,
                    height: 30
                  })
                }
              >
                <Award className="h-3.5 w-3.5 mr-2 text-indigo-600" /> Organization Name
              </Button>

              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-8 min-w-0 px-2.5 overflow-hidden"
                  onClick={() =>
                    addElement("text", {
                      name: "Certificate Number",
                      text: "Cert No: {{certificate.number}}",
                      fontSize: 9,
                      fontFamily: "Courier",
                      color: "#64748B",
                      width: 180,
                      height: 18
                    })
                  }
                >
                  <span className="truncate min-w-0">Cert Number</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-8 min-w-0 px-2.5 overflow-hidden"
                  onClick={() =>
                    addElement("text", {
                      name: "Verification Code",
                      text: "ID: {{certificate.verificationCode}}",
                      fontSize: 8.5,
                      fontFamily: "Courier",
                      color: "#64748B",
                      width: 180,
                      height: 18
                    })
                  }
                >
                  <span className="truncate min-w-0">Verify Code</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Images and Authority */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Images & Authority</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "image", {
                    name: "Organization Logo",
                    url: primaryLogoData?.primaryLogo?.url || primaryLogoData?.primaryLogo?.storagePath ? getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) : "{{organization.logo}}",
                    width: 120,
                    height: 60,
                    isLogo: true
                  })
                }
                onClick={() => {
                  const resolvedLogo = primaryLogoData?.primaryLogo
                    ? (getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) || primaryLogoData.primaryLogo.url)
                    : "{{organization.logo}}";
                  addElement("image", {
                    name: "Organization Logo",
                    url: resolvedLogo,
                    width: 120,
                    height: 60,
                    isLogo: true
                  });
                }}
              >
                <ImageIcon className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" /><span className="truncate min-w-0">Logo</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("signature", {
                    name: "HR Signature",
                    signatoryName: "Head of People & Culture",
                    width: 160,
                    height: 55,
                    fontFamily: "Georgia"
                  })
                }
              >
                <PenTool className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" /><span className="truncate min-w-0">Signature</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "seal", {
                    name: "Official Seal",
                    width: 65,
                    height: 65,
                    fill: "#D97706"
                  })
                }
                onClick={() =>
                  addElement("seal", {
                    name: "Official Seal",
                    width: 65,
                    height: 65,
                    fill: "#D97706"
                  })
                }
              >
                <Shield className="h-3.5 w-3.5 mr-1.5 shrink-0 text-amber-500" /><span className="truncate min-w-0">Seal</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "qrcode", {
                    name: "Verification QR",
                    width: 45,
                    height: 45,
                    placeholder: "{{certificate.verificationUrl}}"
                  })
                }
                onClick={() =>
                  addElement("qrcode", {
                    name: "Verification QR",
                    width: 45,
                    height: 45,
                    placeholder: "{{certificate.verificationUrl}}"
                  })
                }
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" /><span className="truncate min-w-0">QR Code</span>
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-9"
              onClick={() =>
                addElement("image", {
                  name: "Certificate Background",
                  url: "/certificate-bg-default.webp",
                  width: canvasWidth,
                  height: canvasHeight,
                  x: 0,
                  y: 0,
                  zIndex: 0,
                  isBackground: true,
                  opacity: 0.2
                })
              }
            >
              <ImageIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Background Image
            </Button>
          </div>

          {/* Shapes & Decorative */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Shapes</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "shape", {
                    shapeType: "rectangle",
                    name: "Rectangle",
                    width: 200,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    borderRadius: 0,
                    fill: "transparent"
                  })
                }
                onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Rectangle",
                    width: 200,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    borderRadius: 0,
                    fill: "transparent"
                  })
                }
              >
                <Square className="h-3.5 w-3.5 mr-1.5 shrink-0" /><span className="truncate min-w-0">Rectangle</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("shape", {
                    shapeType: "circle",
                    name: "Circle",
                    width: 100,
                    height: 100,
                    stroke: "#D97706",
                    strokeWidth: 2,
                    fill: "transparent"
                  })
                }
              >
                <Circle className="h-3.5 w-3.5 mr-1.5 shrink-0" /><span className="truncate min-w-0">Circle</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("shape", {
                    shapeType: "line",
                    name: "Divider Line",
                    width: 250,
                    height: 2,
                    stroke: "#D97706",
                    strokeWidth: 2,
                    lineStyle: "solid"
                  })
                }
              >
                <Minus className="h-3.5 w-3.5 mr-1.5 shrink-0" /><span className="truncate min-w-0">Line</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs h-9 min-w-0 px-2.5 overflow-hidden"
                onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Decorative Border",
                    width: 780,
                    height: 540,
                    x: 30,
                    y: 30,
                    stroke: "#1E3A8A",
                    strokeWidth: 3,
                    borderRadius: 4,
                    fill: "transparent"
                  })
                }
              >
                <Square className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" /><span className="truncate min-w-0">Border</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── CENTER CANVAS: WYSIWYG Page View with Interactive Handles ── */}
        <div
          ref={canvasContainerRef}
          className="flex-1 overflow-auto p-12 flex items-center justify-center bg-muted/40 relative cursor-default"
          onClick={(e) => {
            if (justFinishedInteractionRef.current) {
              justFinishedInteractionRef.current = false;
              return;
            }
            if (
              e.target === canvasContainerRef.current ||
              (e.target as HTMLElement)?.id === "certificate-canvas" ||
              (e.target as HTMLElement)?.classList.contains("border-dashed")
            ) {
              setSelectedElementId(null);
            }
          }}
        >
          {/* Alignment Snapping Guides */}
          {activeGuide?.vertical !== undefined && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none border-l-2 border-dashed border-primary z-50 transition-all opacity-80"
              style={{
                left: `calc(50% - ${(canvasWidth / 2 - activeGuide.vertical) * zoom}px)`
              }}
            />
          )}
          {activeGuide?.horizontal !== undefined && (
            <div
              className="absolute left-0 right-0 pointer-events-none border-t-2 border-dashed border-primary z-50 transition-all opacity-80"
              style={{
                top: `calc(50% - ${(canvasHeight / 2 - activeGuide.horizontal) * zoom}px)`
              }}
            />
          )}

          {/* Canvas Document */}
          <div
            id="certificate-canvas"
            ref={canvasRef}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onClick={(e) => {
              if (justFinishedInteractionRef.current) {
                justFinishedInteractionRef.current = false;
                return;
              }
              if (
                e.target === canvasRef.current ||
                (e.target as HTMLElement)?.id === "certificate-canvas" ||
                (e.target as HTMLElement)?.classList.contains("border-dashed")
              ) {
                setSelectedElementId(null);
              }
            }}
            className="bg-white shadow-2xl relative select-none border border-slate-200"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoom})`,
              transformOrigin: "center center"
            }}
          >
            {/* Safe Margin Guide Boundary */}
            <div className="absolute inset-6 border border-dashed border-slate-200 pointer-events-none" />

            {/* Elements Layer Stacking */}
            {elements
              .filter((el) => !el.hidden)
              .map((el) => {
                const isSelected = el.id === selectedElementId;

                return (
                  <div
                    key={el.id}
                    data-element-id={el.id}
                    data-element-type={el.type}
                    onPointerDown={(e) => handlePointerDownElement(e, el)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (justFinishedInteractionRef.current) return;
                      setSelectedElementId(el.id);
                    }}
                    className={`absolute select-none group ${
                      el.locked
                        ? "cursor-not-allowed opacity-90"
                        : "cursor-move"
                    }`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      zIndex: el.zIndex || 10,
                      opacity: el.opacity !== undefined ? el.opacity : 1,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                      transformOrigin: "center center"
                    }}
                  >
                    {/* Element Render Body */}
                    {el.type === "text" && (
                      editingTextElementId === el.id ? (
                        <textarea
                          autoFocus
                          value={editingTextValue}
                          onChange={(e) => setEditingTextValue(e.target.value)}
                          onBlur={() => {
                            updateSelectedElement({ text: editingTextValue });
                            setEditingTextElementId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingTextElementId(null);
                            } else if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              updateSelectedElement({ text: editingTextValue });
                              setEditingTextElementId(null);
                            }
                          }}
                          className="w-full h-full p-1 bg-white text-foreground border-2 border-primary rounded resize-none outline-none text-center shadow-lg z-50 pointer-events-auto"
                          style={{
                            fontFamily: el.fontFamily || "Inter",
                            fontSize: `${el.fontSize || 14}px`,
                            fontWeight: el.fontWeight || "normal",
                            fontStyle: el.fontStyle || "normal",
                            color: el.color || "#0F172A",
                            lineHeight: el.lineHeight || 1.3,
                            textAlign: el.textAlign || "center"
                          }}
                        />
                      ) : (
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingTextElementId(el.id);
                          setEditingTextValue(el.text || "");
                        }}
                        className="w-full h-full flex items-center overflow-hidden break-words pointer-events-auto cursor-text"
                        style={{
                          fontFamily: el.fontFamily || "Inter",
                          fontSize: `${el.fontSize || 14}px`,
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          color: el.color || "#0F172A",
                          textAlign: el.textAlign || "center",
                          textDecoration: el.underline ? "underline" : "none",
                          lineHeight: el.lineHeight || 1.3,
                          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : "normal",
                          textTransform: el.textTransform || "none",
                          justifyContent:
                            el.textAlign === "left"
                              ? "flex-start"
                              : el.textAlign === "right"
                              ? "flex-end"
                              : el.textAlign === "justify"
                              ? "space-between"
                              : "center"
                        }}
                      >
                        {resolveDisplayText(el.text)}
                      </div>
                      )
                    )}

                    {el.type === "shape" && (
                      <div
                        className="w-full h-full pointer-events-none"
                        style={{
                          border: el.stroke
                            ? `${el.strokeWidth || 1}px ${el.lineStyle || "solid"} ${el.stroke}`
                            : "none",
                          backgroundColor: el.fill || "transparent",
                          borderRadius: el.shapeType === "circle" ? "50%" : el.borderRadius ? `${el.borderRadius}px` : "0px"
                        }}
                      />
                    )}

                    {(el.type === "qrcode" || el.type === "qr" || el.id?.toLowerCase().includes("qr")) && (
                      <div className="w-full h-full bg-white border border-slate-300 flex items-center justify-center p-0.5 pointer-events-none overflow-hidden shadow-xs relative">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="Verification QR"
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        ) : (
                          <QrCode className="w-full h-full text-slate-800" />
                        )}
                        
                      </div>
                    )}

                    {(el.type === "seal" || el.isSeal || el.id?.toLowerCase().includes("seal") || el.name?.toLowerCase().includes("seal")) && (
                      <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        {(computedData.officialSealUrl || (el.url && !el.url.includes("{{"))) ? (
                          <img
                            src={computedData.officialSealUrl || el.url}
                            alt="Official Seal"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-full border-2 flex flex-col items-center justify-center text-[7px] font-bold text-center uppercase"
                            style={{ borderColor: el.fill || "#D97706", color: el.fill || "#D97706" }}
                          >
                            <span>OFFICIAL</span>
                            <span>SEAL</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(el.type === "signature" || el.id?.toLowerCase().includes("sig") || el.name?.toLowerCase().includes("signature")) && (() => {
                      const effectiveSigType = el.signatoryType || (el.id?.toLowerCase().includes("hr") || el.name?.toLowerCase().includes("hr") ? "HR" : (el.id?.toLowerCase().includes("ceo") || el.name?.toLowerCase().includes("ceo")) ? "CEO" : (el.id?.toLowerCase().includes("dir") || el.name?.toLowerCase().includes("dir")) ? "DIRECTOR" : "HR");
                      const resolvedSigUrl = el.signatureUrl || (el.url && !el.url.includes("{{") ? el.url : null) || (effectiveSigType === "HR" ? computedData.hrSignatureUrl : effectiveSigType === "DIRECTOR" ? computedData.directorSignatureUrl : computedData.ceoSignatureUrl) || computedData.hrSignatureUrl || computedData.ceoSignatureUrl;
                      const resolvedSigName = el.signatoryName || (el.placeholder ? computedData[el.placeholder] : null) || (effectiveSigType === "HR" ? (previewContextData?.context?.signatoryRoles?.hr?.name || "Head of Human Resources") : (previewContextData?.context?.signatoryRoles?.ceo?.name || "Chief Executive Officer"));
                      const resolvedSigDesig = el.signatoryDesignation || (effectiveSigType === "HR" ? (previewContextData?.context?.signatoryRoles?.hr?.designation || "Director of People & Culture") : (previewContextData?.context?.signatoryRoles?.ceo?.designation || "Chief Executive Officer"));

                      return (
                        <div className="w-full h-full flex flex-col items-center justify-end pb-1 border-b border-foreground/40 pointer-events-none relative">
                          {resolvedSigUrl ? (
                            <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-0.5">
                              <img
                                src={resolvedSigUrl}
                                alt="Signature"
                                className="h-full max-h-12 object-contain pointer-events-none"
                              />
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}
                          <span className="text-[10px] font-semibold text-foreground/80 leading-none">
                            {resolvedSigName}
                          </span>
                          {resolvedSigDesig && (
                            <span className="text-[8px] text-muted-foreground leading-tight mt-0.5">
                              {resolvedSigDesig}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {(el.type === "logo" || el.type === "image" || el.isLogo || el.id?.toLowerCase().includes("logo") || el.placeholder === "{{organization.logo}}") && (() => {
                      const resolvedLogoUrl = (el.url && !el.url.includes("{{")) ? el.url : (computedData.primaryLogoUrl || primaryLogoAsset?.url || null);
                      return (
                        <div className="w-full h-full flex items-center justify-center p-1 border border-dashed border-slate-300 bg-slate-50/50 pointer-events-none overflow-hidden">
                          {resolvedLogoUrl ? (
                            <img
                              src={resolvedLogoUrl}
                              alt={el.name || "Organization Logo"}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <div className="flex items-center text-slate-500">
                              <ImageIcon className="h-5 w-5 mr-1 text-slate-400" />
                              <span className="text-[10px] font-medium truncate">{el.name || "Organization Logo"}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Active Selection Bounding Box & Canva-Style Resize Handles */}
                    {isSelected && (
                      <div
                        className="absolute inset-0 border-2 border-primary ring-1 ring-primary/30 pointer-events-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Status / Dimension Floating Pill */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                          {liveTransformText || `W: ${Math.round(el.width)} × H: ${Math.round(el.height)}`}
                        </div>

                        {!el.locked && (
                          <>
                            {/* Rotation Handle Stalk & Circular Knob */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-primary pointer-events-none" />
                            <div
                              data-handle="rot"
                              onPointerDown={(e) => handlePointerDownHandle(e, "rot", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-7 left-1/2 -translate-x-1/2 size-4 bg-white border-2 border-primary rounded-full cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center shadow hover:scale-125 transition-transform z-50"
                              title="Rotate Element"
                            >
                              <RotateCw className="size-2.5 text-primary pointer-events-none" />
                            </div>

                            {/* 4 Corner Resize Handles */}
                            <div
                              data-handle="nw"
                              onPointerDown={(e) => handlePointerDownHandle(e, "nw", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-1.5 -left-1.5 size-3 bg-white border-2 border-primary rounded-sm cursor-nwse-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                            />
                            <div
                              data-handle="ne"
                              onPointerDown={(e) => handlePointerDownHandle(e, "ne", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-1.5 -right-1.5 size-3 bg-white border-2 border-primary rounded-sm cursor-nesw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                            />
                            <div
                              data-handle="se"
                              onPointerDown={(e) => handlePointerDownHandle(e, "se", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-1.5 -right-1.5 size-3 bg-white border-2 border-primary rounded-sm cursor-nwse-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                            />
                            <div
                              data-handle="sw"
                              onPointerDown={(e) => handlePointerDownHandle(e, "sw", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-1.5 -left-1.5 size-3 bg-white border-2 border-primary rounded-sm cursor-nesw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                            />

                            {/* 4 Edge Handles */}
                            <div
                              data-handle="n"
                              onPointerDown={(e) => handlePointerDownHandle(e, "n", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-white border border-primary rounded cursor-ns-resize pointer-events-auto shadow-sm z-50"
                            />
                            <div
                              data-handle="s"
                              onPointerDown={(e) => handlePointerDownHandle(e, "s", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-white border border-primary rounded cursor-ns-resize pointer-events-auto shadow-sm z-50"
                            />
                            <div
                              data-handle="w"
                              onPointerDown={(e) => handlePointerDownHandle(e, "w", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-3.5 bg-white border border-primary rounded cursor-ew-resize pointer-events-auto shadow-sm z-50"
                            />
                            <div
                              data-handle="e"
                              onPointerDown={(e) => handlePointerDownHandle(e, "e", el)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-1/2 -translate-y-1/2 -right-1 w-1.5 h-3.5 bg-white border border-primary rounded cursor-ew-resize pointer-events-auto shadow-sm z-50"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Context Properties Inspector & Layers ── */}
        <div className="w-80 border-l bg-background flex flex-col shrink-0 z-10">
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
            <TabsContent value="properties" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
              {selectedElement ? (
                <div className="space-y-4">
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {selectedElement.type.toUpperCase()}
                      </span>
                      {selectedElement.locked && (
                        <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="size-3" /> Locked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateElement(selectedElement.id)}
                        title="Duplicate (Ctrl+D)"
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLock(selectedElement.id)}
                        title={selectedElement.locked ? "Unlock element" : "Lock element"}
                        className="h-7 w-7 p-0"
                      >
                        {selectedElement.locked ? <Lock className="h-3.5 w-3.5 text-amber-600" /> : <Unlock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteElement(selectedElement.id)}
                        title="Delete (Delete)"
                        className="text-destructive h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Element Name */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Layer / Element Name</Label>
                    <Input
                      value={selectedElement.name || ""}
                      onChange={(e) => updateSelectedElement({ name: e.target.value })}
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  {/* Dimensions & Position (X, Y, W, H, Rotation, Opacity) */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold">Transform & Position</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">X (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.x)}
                          onChange={(e) => updateSelectedElement({ x: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Y (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.y)}
                          onChange={(e) => updateSelectedElement({ y: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Width (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.width)}
                          onChange={(e) => updateSelectedElement({ width: parseFloat(e.target.value) || 10 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Height (pt)</span>
                        <Input
                          type="number"
                          value={Math.round(selectedElement.height)}
                          onChange={(e) => updateSelectedElement({ height: parseFloat(e.target.value) || 4 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Rotation (deg)</span>
                        <Input
                          type="number"
                          min={0}
                          max={360}
                          value={selectedElement.rotation || 0}
                          onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) || 0 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Opacity (%)</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round((selectedElement.opacity ?? 1) * 100)}
                          onChange={(e) => updateSelectedElement({ opacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 100)) / 100 })}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Typography Panel for Text & Placeholders */}
                  {selectedElement.type === "text" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-semibold">Typography</Label>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">Text / Placeholder Template</Label>
                        <Textarea
                          value={selectedElement.text || ""}
                          onChange={(e) => updateSelectedElement({ text: e.target.value })}
                          rows={2}
                          className="text-xs font-mono"
                        />
                        {selectedElement.text?.includes("{{") && (
                          <p className="text-[10px] text-amber-600 bg-amber-500/10 p-1.5 rounded">
                            Dynamic token recognized. Value will resolve at certificate issuance.
                          </p>
                        )}
                      </div>

                      {/* Font Family */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Font Family</Label>
                        <Select
                          value={selectedElement.fontFamily || "Inter"}
                          onValueChange={(val) => updateSelectedElement({ fontFamily: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_FAMILIES.map((f) => (
                              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Font Size & Stepper */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Font Size (pt)</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedElement({ fontSize: Math.max(6, (selectedElement.fontSize || 14) - 1) })}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={selectedElement.fontSize || 14}
                              onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 12 })}
                              className="h-7 text-xs font-mono text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedElement({ fontSize: (selectedElement.fontSize || 14) + 1 })}
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {/* Font Weight */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Weight</Label>
                          <Select
                            value={selectedElement.fontWeight || "normal"}
                            onValueChange={(val) => updateSelectedElement({ fontWeight: val })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Regular (400)</SelectItem>
                              <SelectItem value="medium">Medium (500)</SelectItem>
                              <SelectItem value="semibold">SemiBold (600)</SelectItem>
                              <SelectItem value="bold">Bold (700)</SelectItem>
                              <SelectItem value="800">ExtraBold (800)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Style Toggles: Bold, Italic, Underline */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant={selectedElement.fontWeight === "bold" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" })}
                          className="h-7 w-7 p-0"
                          title="Bold"
                        >
                          <Bold className="size-3.5" />
                        </Button>
                        <Button
                          variant={selectedElement.fontStyle === "italic" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}
                          className="h-7 w-7 p-0"
                          title="Italic"
                        >
                          <Italic className="size-3.5" />
                        </Button>
                        <Button
                          variant={selectedElement.underline ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ underline: !selectedElement.underline })}
                          className="h-7 w-7 p-0"
                          title="Underline"
                        >
                          <UnderlineIcon className="size-3.5" />
                        </Button>
                        <div className="h-4 w-px bg-border mx-1" />

                        {/* Alignment buttons */}
                        <Button
                          variant={selectedElement.textAlign === "left" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ textAlign: "left" })}
                          className="h-7 w-7 p-0"
                          title="Align Left"
                        >
                          <AlignLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant={(!selectedElement.textAlign || selectedElement.textAlign === "center") ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ textAlign: "center" })}
                          className="h-7 w-7 p-0"
                          title="Align Center"
                        >
                          <AlignCenter className="size-3.5" />
                        </Button>
                        <Button
                          variant={selectedElement.textAlign === "right" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ textAlign: "right" })}
                          className="h-7 w-7 p-0"
                          title="Align Right"
                        >
                          <AlignRight className="size-3.5" />
                        </Button>
                        <Button
                          variant={selectedElement.textAlign === "justify" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSelectedElement({ textAlign: "justify" })}
                          className="h-7 w-7 p-0"
                          title="Justify"
                        >
                          <AlignJustify className="size-3.5" />
                        </Button>
                      </div>

                      {/* Text Color */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Text Color</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedElement.color || "#0F172A"}
                            onChange={(e) => updateSelectedElement({ color: e.target.value })}
                            className="w-7 h-7 rounded border cursor-pointer p-0"
                          />
                          <Input
                            value={selectedElement.color || "#0F172A"}
                            onChange={(e) => updateSelectedElement({ color: e.target.value })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Advanced Typography: Line Height, Letter Spacing, Transform */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Line Height</Label>
                          <Select
                            value={String(selectedElement.lineHeight || "1.3")}
                            onValueChange={(val) => updateSelectedElement({ lineHeight: parseFloat(val) })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1.0">1.0 (Tight)</SelectItem>
                              <SelectItem value="1.2">1.2 (Compact)</SelectItem>
                              <SelectItem value="1.3">1.3 (Normal)</SelectItem>
                              <SelectItem value="1.5">1.5 (Relaxed)</SelectItem>
                              <SelectItem value="1.8">1.8 (Loose)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Letter Spacing (pt)</Label>
                          <Input
                            type="number"
                            min={-2}
                            max={12}
                            value={selectedElement.letterSpacing || 0}
                            onChange={(e) => updateSelectedElement({ letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shape Styling (Rectangle, Circle, Line) */}
                  {selectedElement.type === "shape" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-semibold">Shape Appearance</Label>

                      {/* Shape Type Selector */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Shape Type</Label>
                        <Select
                          value={selectedElement.shapeType || "rectangle"}
                          onValueChange={(val) => updateSelectedElement({ shapeType: val })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rectangle">Rectangle</SelectItem>
                            <SelectItem value="circle">Circle</SelectItem>
                            <SelectItem value="line">Line</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fill Color */}
                      {selectedElement.shapeType !== "line" && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground">Fill Color</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px]"
                              onClick={() => updateSelectedElement({ fill: selectedElement.fill === "transparent" ? "#FAF5FF" : "transparent" })}
                            >
                              {selectedElement.fill === "transparent" ? "Set Solid" : "Set Transparent"}
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={selectedElement.fill && selectedElement.fill !== "transparent" ? selectedElement.fill : "#FFFFFF"}
                              onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                              className="w-7 h-7 rounded border cursor-pointer p-0"
                            />
                            <Input
                              value={selectedElement.fill || "transparent"}
                              onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Stroke Color */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Stroke / Line Color</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedElement.stroke || "#1E3A8A"}
                            onChange={(e) => updateSelectedElement({ stroke: e.target.value })}
                            className="w-7 h-7 rounded border cursor-pointer p-0"
                          />
                          <Input
                            value={selectedElement.stroke || "#1E3A8A"}
                            onChange={(e) => updateSelectedElement({ stroke: e.target.value })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Stroke Width & Line Style */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Thickness (pt)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={selectedElement.strokeWidth || 1}
                            onChange={(e) => updateSelectedElement({ strokeWidth: parseInt(e.target.value) || 1 })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Style</Label>
                          <Select
                            value={selectedElement.lineStyle || "solid"}
                            onValueChange={(val) => updateSelectedElement({ lineStyle: val })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="solid">Solid</SelectItem>
                              <SelectItem value="dashed">Dashed</SelectItem>
                              <SelectItem value="dotted">Dotted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Border Radius for Rectangles */}
                      {selectedElement.shapeType !== "line" && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Corner Radius (pt)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            value={selectedElement.borderRadius || 0}
                            onChange={(e) => updateSelectedElement({ borderRadius: parseInt(e.target.value) || 0 })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Settings */}
                  {selectedElement.type === "qrcode" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-semibold">Verification QR Code</Label>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Dynamically encodes the cryptographic verification URL for real-time authenticity validation.
                      </p>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Binding Placeholder</Label>
                        <Input
                          value={selectedElement.placeholder || "{{certificate.verificationUrl}}"}
                          disabled
                          className="h-7 text-xs font-mono bg-muted"
                        />
                      </div>
                    </div>
                  )}

                  {/* Seal Settings */}
                  {selectedElement.type === "seal" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-semibold">Official Seal Styling</Label>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Seal Color</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedElement.fill || "#D97706"}
                            onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                            className="w-7 h-7 rounded border cursor-pointer p-0"
                          />
                          <Input
                            value={selectedElement.fill || "#D97706"}
                            onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signature Settings */}
                  {selectedElement.type === "signature" && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-xs font-semibold">Signatory Details</Label>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Signatory Name</Label>
                        <Input
                          value={selectedElement.signatoryName || ""}
                          onChange={(e) => updateSelectedElement({ signatoryName: e.target.value })}
                          className="h-8 text-xs font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <Sliders className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs font-medium">No element selected</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Click any element on the canvas to drag, resize, rotate, and customize its properties.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Layers Panel */}
            <TabsContent value="layers" className="p-3 flex-1 overflow-y-auto space-y-1 m-0">
              {elements.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No layers in document.</div>
              ) : (
                // Display layers with highest zIndex at top
                [...elements]
                  .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                  .map((el) => {
                    const isSelected = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary font-medium"
                            : "hover:bg-muted/50 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          {el.locked ? (
                            <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                          ) : el.hidden ? (
                            <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                          ) : (
                            <span className="size-1.5 rounded-full bg-primary/60 shrink-0" />
                          )}
                          <span className="truncate">{el.name || el.type}</span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {/* Bring to Front */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderLayer(el.id, "bringToFront");
                            }}
                            title="Bring to Front"
                            className="h-6 w-6 p-0"
                          >
                            <ChevronsUp className="h-3 w-3" />
                          </Button>
                          {/* Bring Forward */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderLayer(el.id, "bringForward");
                            }}
                            title="Bring Forward"
                            className="h-6 w-6 p-0"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          {/* Send Backward */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderLayer(el.id, "sendBackward");
                            }}
                            title="Send Backward"
                            className="h-6 w-6 p-0"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          {/* Send to Back */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderLayer(el.id, "sendToBack");
                            }}
                            title="Send to Back"
                            className="h-6 w-6 p-0"
                          >
                            <ChevronsDown className="h-3 w-3" />
                          </Button>
                          {/* Lock Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(el.id);
                            }}
                            title={el.locked ? "Unlock layer" : "Lock layer"}
                            className="h-6 w-6 p-0"
                          >
                            {el.locked ? <Lock className="h-3 w-3 text-amber-600" /> : <Unlock className="h-3 w-3" />}
                          </Button>
                          {/* Visibility Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisibility(el.id);
                            }}
                            title={el.hidden ? "Show layer" : "Hide layer"}
                            className="h-6 w-6 p-0"
                          >
                            {el.hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            title="Delete Layer"
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      
      {/* ── Replace Branding Asset / Choose Logo Modal ── */}
      <Dialog open={isReplaceLogoModalOpen} onOpenChange={setIsReplaceLogoModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Select Branding Asset from File Manager
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            <p className="text-xs text-muted-foreground">
              Choose an authorized branding asset from your organization library or File Manager to bind to this certificate.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(brandingData?.assets || []).map((asset: any) => {
                const previewUrl = getCertificateAssetPreviewUrl(asset.id, asset.fileId, asset.storagePath);
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      if (selectedElementId) {
                        updateSelectedElement({
                          url: previewUrl,
                          name: asset.assetName,
                          assetId: asset.id
                        });
                        toast.success(`Applied ${asset.assetName}`);
                      }
                      setIsReplaceLogoModalOpen(false);
                    }}
                    className="group border rounded-lg p-2.5 flex flex-col items-center justify-between gap-2 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card"
                  >
                    <div className="w-full h-24 bg-muted/30 rounded flex items-center justify-center p-2 overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt={asset.assetName} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-medium truncate" title={asset.assetName}>
                        {asset.assetName}
                      </p>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {asset.assetType}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {(!brandingData?.assets || brandingData.assets.length === 0) && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No branding assets uploaded. Visit Certificate Branding to upload primary logos, official seals, and watermarks.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview PDF Vector Dialog ── */}
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
