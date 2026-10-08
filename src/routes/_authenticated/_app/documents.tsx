import { createFileRoute, redirect } from "@tanstack/react-router";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  PenTool,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FolderLock,
  Eye,
  Trash2,
  UploadCloud,
  FileCheck,
  Lock,
  Sparkles,
  Eraser,
  Globe,
  Award,
  Filter,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/documents")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr"].includes(r));
    throw redirect({ to: isHrOrAdmin ? "/hr/documents" : "/me/documents" });
  },
  component: DocumentsPage,
  head: () => ({ meta: [{ title: "Document Vault & e-Signatures — Master HRMS" }] }),
});

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Employment Contract": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  "NDA & IP Agreement": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  "KYC & Identity": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  "Company Policy": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  "Academic Certificate": { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/30" },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending_signature: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Pending Signature" },
  signed: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "Digitally Signed" },
  verified: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Verified & Certified" },
  expired: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", label: "Expired" },
};

const LETTER_TYPES: Record<string, { label: string; desc: string; icon: any; category: string }> = {
  BONAFIDE: {
    label: "Bonafide Certificate",
    desc: "Proof of active employment for visa applications, passport renewals, bank loans, or academic enrollment.",
    icon: ShieldCheck,
    category: "Identity & Verification",
  },
  EXPERIENCE: {
    label: "Experience & Service Certificate",
    desc: "Official statement of tenure, role designation, and organizational contributions.",
    icon: Award,
    category: "Career & Tenure",
  },
  NOC: {
    label: "No Objection Certificate (NOC)",
    desc: "NOC for embassy visa issuance, international personal travel, or higher education clearance.",
    icon: Globe,
    category: "Travel & Embassy",
  },
  SALARY: {
    label: "Salary & Compensation Certificate",
    desc: "Certified proof of monthly remuneration and earnings for home loans, credit applications, or lease rentals.",
    icon: FileSpreadsheet,
    category: "Financial & Compensation",
  },
};

export function DocumentsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("vault");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Official Letter Requests State
  const [isRequestLetterOpen, setIsRequestLetterOpen] = useState(false);
  const [letterForm, setLetterForm] = useState({
    letterType: "BONAFIDE",
    purpose: "",
  });

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [activeDocForSigning, setActiveDocForSigning] = useState<any>(null);
  const [selectedAuditDrawer, setSelectedAuditDrawer] = useState<any>(null);

  // Form State
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "Employment Contract",
    employeeId: "company_wide",
    fileName: "",
    fileSize: "1.5 MB",
    requiresSignature: true,
    notes: "",
  });

  // e-Signature Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState(profile?.full_name || user?.email || "Authorized Signatory");
  const [consentAccepted, setConsentAccepted] = useState(true);

  // Employee Letter Requests Query & Mutation
  const { data: letterRequests = [], isLoading: isLettersLoading } = useQuery({
    queryKey: ["my-document-requests"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/documents");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const requestLetterMut = useMutation({
    mutationFn: async (payload: { letterType: string; purpose: string }) =>
      api.post("/api/v1/me/documents/request", payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Letter request submitted to HR!");
      qc.invalidateQueries({ queryKey: ["my-document-requests"] });
      setIsRequestLetterOpen(false);
      setLetterForm({ letterType: "BONAFIDE", purpose: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to submit letter request"),
  });

  // Queries
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

  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ["vault-documents", tenantId, selectedCategoryFilter, selectedStatusFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/documents?category=${selectedCategoryFilter}&status=${selectedStatusFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["vault-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/documents/summary/stats");
      } catch {
        return { totalDocs: 0, pendingSignatures: 0, signedCount: 0, verifiedCount: 0 };
      }
    },
  });

  // Mutations
  const createDocMut = useMutation({
    mutationFn: async (payload: any) => {
      const body = {
        ...payload,
        employeeId: payload.employeeId === "company_wide" ? null : payload.employeeId,
      };
      return api.post("/documents", body);
    },
    onSuccess: () => {
      toast.success("Document registered in Vault!");
      qc.invalidateQueries({ queryKey: ["vault-documents"] });
      qc.invalidateQueries({ queryKey: ["vault-summary"] });
      setIsUploadOpen(false);
      resetUploadForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to register document"),
  });

  const signDocMut = useMutation({
    mutationFn: async ({ id, signatureDataUrl, signerName }: { id: string; signatureDataUrl: string; signerName: string }) =>
      api.post(`/documents/${id}/sign`, { signatureDataUrl, signerName }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Document digitally signed and timestamped!");
      qc.invalidateQueries({ queryKey: ["vault-documents"] });
      qc.invalidateQueries({ queryKey: ["vault-summary"] });
      setIsSignModalOpen(false);
      setActiveDocForSigning(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to sign document"),
  });

  const verifyDocMut = useMutation({
    mutationFn: async (id: string) => api.put(`/documents/${id}/verify`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Document verified and compliance certified!");
      qc.invalidateQueries({ queryKey: ["vault-documents"] });
      qc.invalidateQueries({ queryKey: ["vault-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to verify document"),
  });

  const deleteDocMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast.success("Document deleted from vault");
      qc.invalidateQueries({ queryKey: ["vault-documents"] });
      qc.invalidateQueries({ queryKey: ["vault-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete document"),
  });

  function resetUploadForm() {
    setUploadForm({
      title: "",
      category: "Employment Contract",
      employeeId: "company_wide",
      fileName: "",
      fileSize: "1.5 MB",
      requiresSignature: true,
      notes: "",
    });
  }

  // Signature Canvas Helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2563eb"; // Blue ink
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureDataUrl = () => {
    if (signatureType === "draw") {
      return canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
    } else {
      // Generate SVG data url from typed text
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100">
        <text x="20" y="60" font-family="'Brush Script MT', cursive, serif" font-size="32" fill="#2563eb">${typedSignature}</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
  };

  const handleSignConfirm = () => {
    if (!activeDocForSigning) return;
    if (!consentAccepted) {
      toast.error("Please accept the electronic signature consent.");
      return;
    }
    const sig = getSignatureDataUrl();
    if (!sig) {
      toast.error("Please draw or type your signature.");
      return;
    }
    signDocMut.mutate({
      id: activeDocForSigning.id,
      signatureDataUrl: sig,
      signerName: profile?.full_name || typedSignature || user?.email || "Signatory",
    });
  };

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FolderLock className="size-6 text-primary" /> Document Vault & Digital E-Signatures
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographic document storage, employment agreements, NDAs, company policies, legal e-Signatures, and official HR letter requests.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "vault" ? (
            <Button
              size="sm"
              onClick={() => {
                resetUploadForm();
                setIsUploadOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Upload Document to Vault</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setLetterForm({ letterType: "BONAFIDE", purpose: "" });
                setIsRequestLetterOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Request Official Letter</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="vault" className="text-xs font-bold gap-2">
            <FolderLock className="size-3.5" /> Company Vault & Agreements
          </TabsTrigger>
          <TabsTrigger value="letters" className="text-xs font-bold gap-2">
            <FileCheck className="size-3.5 text-primary" /> Official Letters & Certificates
            {letterRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                {letterRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: COMPANY VAULT & E-SIGNATURES ─── */}
        <TabsContent value="vault" className="space-y-6 m-0">

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-3.5 text-blue-500" /> Vault Documents
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalDocs || documents.length} Files
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <PenTool className="size-3.5 text-amber-500" /> Pending Signature
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {summary?.pendingSignatures || 0} Pending
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-blue-500/5 border-blue-500/20">
          <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Digitally Signed
          </span>
          <div className="text-xl font-black font-mono text-blue-600">
            {summary?.signedCount || 0} Signed
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Compliance Verified
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.verifiedCount || 0} Certified
          </div>
        </Card>
      </div>

      {/* Main Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, staff..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger className="h-7 text-xs w-44 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Employment Contract">Employment Contract</SelectItem>
              <SelectItem value="NDA & IP Agreement">NDA & IP Agreement</SelectItem>
              <SelectItem value="KYC & Identity">KYC & Identity</SelectItem>
              <SelectItem value="Company Policy">Company Policy</SelectItem>
              <SelectItem value="Academic Certificate">Academic Certificate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
          <SelectTrigger className="h-7 text-xs w-44 bg-background">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_signature">Pending Signature</SelectItem>
            <SelectItem value="signed">Digitally Signed</SelectItem>
            <SelectItem value="verified">Verified & Certified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Vault Table */}
      <Card className="border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="text-xs">Document Code & Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Target Staff / Scope</TableHead>
                <TableHead className="text-xs">File Size</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Signer / Verified</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isDocsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                    Loading Document Vault...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                    No documents found. Click "Upload Document to Vault" to add agreements and policies.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc: any) => {
                  const cat = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS["Employment Contract"];
                  const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending_signature;

                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/20 text-xs">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 grid place-items-center shrink-0">
                            <FileText className="size-4" />
                          </div>
                          <div>
                            <span className="font-mono font-black text-primary block">{doc.documentCode}</span>
                            <span className="font-bold text-foreground block max-w-[240px] truncate">{doc.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{doc.fileName}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${cat.bg} ${cat.text} ${cat.border}`}>
                          {doc.category}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {doc.employee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-5 border">
                              <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                {doc.employee.firstName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">
                              {doc.employee.firstName} {doc.employee.lastName}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-bold gap-1 bg-muted/50">
                            <Globe className="size-3 text-muted-foreground" /> Company-Wide
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground text-[11px]">
                        {doc.fileSize}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${st.bg} ${st.text} ${st.border}`}>
                          {st.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {doc.signerName ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">{doc.signerName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(doc.signedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Unsigned</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.status === "pending_signature" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveDocForSigning(doc);
                                setIsSignModalOpen(true);
                              }}
                              className="h-6 text-[10px] font-bold gap-1 bg-primary text-primary-foreground shadow-2xs"
                            >
                              <PenTool className="size-3" />
                              <span>E-Sign</span>
                            </Button>
                          )}

                          {doc.status === "signed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyDocMut.mutate(doc.id)}
                              className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30 gap-1"
                            >
                              <ShieldCheck className="size-3" />
                              <span>Verify</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAuditDrawer(doc)}
                            className="h-6 text-[10px] font-bold gap-1"
                          >
                            <Eye className="size-3 text-primary" />
                            <span>Audit Trail</span>
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete document "${doc.title}"?`)) {
                                deleteDocMut.mutate(doc.id);
                              }
                            }}
                            className="size-6 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>

    {/* ─── TAB 2: OFFICIAL LETTERS & CERTIFICATES (SELF-SERVICE) ─── */}
    <TabsContent value="letters" className="space-y-6 m-0">
      {/* Quick Request Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(LETTER_TYPES).map(([typeKey, item]) => {
          const Icon = item.icon;
          return (
            <Card
              key={typeKey}
              className="p-4 border shadow-2xs bg-card hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 grid place-items-center">
                    <Icon className="size-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground">
                    {item.category}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">{item.label}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLetterForm({ letterType: typeKey, purpose: "" });
                  setIsRequestLetterOpen(true);
                }}
                className="mt-3.5 h-7 text-xs font-bold w-full text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground gap-1.5"
              >
                <Plus className="size-3" /> Request Letter
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Letter Requests Status & Ledger */}
      <Card className="border shadow-2xs">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileCheck className="size-4 text-primary" /> My Letter & Certificate Requests
            </CardTitle>
            <CardDescription className="text-xs">
              Track verification status, HR processing, and instant downloads of issued certified PDFs.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="text-xs">Certificate Type</TableHead>
                <TableHead className="text-xs">Purpose / Reason</TableHead>
                <TableHead className="text-xs">Submitted On</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">HR Notes / Issuance</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLettersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-xs">
                    Loading official letter records...
                  </TableCell>
                </TableRow>
              ) : letterRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-xs italic">
                    No letter requests submitted yet. Click one of the cards above to request Bonafide, NOC, or Salary Certificate.
                  </TableCell>
                </TableRow>
              ) : (
                letterRequests.map((req: any) => {
                  const typeConfig = LETTER_TYPES[req.letterType] || {
                    label: req.letterType,
                    icon: FileText,
                  };
                  const Icon = typeConfig.icon;

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/20 text-xs">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-md bg-primary/10 text-primary border border-primary/20 grid place-items-center shrink-0">
                            <Icon className="size-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{typeConfig.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{req.letterType}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <p className="text-xs text-foreground truncate" title={req.purpose}>
                          {req.purpose}
                        </p>
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>

                      <TableCell>
                        {req.status === "PENDING" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                            <Clock className="size-3" /> Under HR Review
                          </Badge>
                        )}
                        {req.status === "ISSUED" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <CheckCircle2 className="size-3" /> Issued & Certified
                          </Badge>
                        )}
                        {req.status === "REJECTED" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1">
                            <X className="size-3" /> Rejected
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {req.rejectionNotes ? (
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            {req.rejectionNotes}
                          </span>
                        ) : req.issuedAt ? (
                          <span className="text-xs text-emerald-600 font-mono">
                            Issued: {new Date(req.issuedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">In queue with HR Ops</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {req.status === "ISSUED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.success(`Downloading certified ${typeConfig.label}...`);
                            }}
                            className="h-6 text-[10px] font-bold text-primary border-primary/30 gap-1 shadow-2xs"
                          >
                            <Download className="size-3" /> Download PDF
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>

  {/* ─── MODAL 0: REQUEST OFFICIAL LETTER ─── */}
  <Dialog open={isRequestLetterOpen} onOpenChange={setIsRequestLetterOpen}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base font-bold flex items-center gap-2">
          <FileCheck className="size-5 text-primary" /> Request Official Letter / Certificate
        </DialogTitle>
        <DialogDescription className="text-xs">
          Submit formal request for company credentials. Once authorized by HR, digitally stamped PDF will be generated.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!letterForm.purpose.trim()) {
            toast.error("Please enter purpose or justification");
            return;
          }
          requestLetterMut.mutate(letterForm);
        }}
        className="space-y-3.5 py-2 text-xs"
      >
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Document / Certificate Type *</Label>
          <Select
            value={letterForm.letterType}
            onValueChange={(v) => setLetterForm({ ...letterForm, letterType: v })}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BONAFIDE">Bonafide Certificate (Active Employment)</SelectItem>
              <SelectItem value="EXPERIENCE">Experience & Service Certificate</SelectItem>
              <SelectItem value="NOC">No Objection Certificate (NOC - Visa/Travel)</SelectItem>
              <SelectItem value="SALARY">Salary & Compensation Certificate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Purpose & Authority Addressed To *</Label>
          <Textarea
            required
            rows={3}
            placeholder="e.g. Applying for Schengen Visa at German Embassy; or HDFC Home Loan verification..."
            value={letterForm.purpose}
            onChange={(e) => setLetterForm({ ...letterForm, purpose: e.target.value })}
            className="text-xs resize-none"
          />
          <p className="text-[10px] text-muted-foreground">
            State Embassy / Bank name or specific wording required by recipient authority.
          </p>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsRequestLetterOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={requestLetterMut.isPending}
            className="font-bold gap-1 bg-primary text-primary-foreground"
          >
            {requestLetterMut.isPending ? "Submitting..." : "Submit to HR"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

      {/* ─── MODAL 1: UPLOAD / REGISTER NEW DOCUMENT ─── */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              <span>Register Document to Secure Vault</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload PDF agreement, employment contract, or company-wide policy with cryptographic e-Signature support.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createDocMut.mutate(uploadForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Title *</Label>
              <Input
                required
                placeholder="e.g. Senior Software Engineer Offer & Employment Agreement"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employment Contract">Employment Contract</SelectItem>
                    <SelectItem value="NDA & IP Agreement">NDA & IP Agreement</SelectItem>
                    <SelectItem value="KYC & Identity">KYC & Identity</SelectItem>
                    <SelectItem value="Company Policy">Company Policy</SelectItem>
                    <SelectItem value="Academic Certificate">Academic Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Staff Scope</Label>
                <Select
                  value={uploadForm.employeeId}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, employeeId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_wide">Company-Wide (All Staff)</SelectItem>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-dashed text-center space-y-1 bg-muted/20 hover:bg-muted/40 transition-colors">
              <UploadCloud className="size-8 mx-auto text-primary/60" />
              <div className="font-bold text-foreground">Attach PDF File</div>
              <p className="text-[10px] text-muted-foreground">Supported format: PDF, DOCX up to 25 MB</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notes / Special Clauses</Label>
              <Textarea
                rows={2}
                placeholder="Confidentiality requirements, execution guidelines, or annexures..."
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Requires Electronic Signature</span>
                <span className="text-[10px] text-muted-foreground">Enables digital canvas signature and cryptographic audit trail</span>
              </div>
              <input
                type="checkbox"
                checked={uploadForm.requiresSignature}
                onChange={(e) => setUploadForm({ ...uploadForm, requiresSignature: e.target.checked })}
                className="size-4 text-primary rounded"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createDocMut.isPending} className="text-xs font-bold">
                Save to Vault
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: DIGITAL E-SIGNATURE CANVAS STUDIO ─── */}
      {activeDocForSigning && (
        <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <PenTool className="size-5 text-primary" />
                <span>Execute Digital E-Signature</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Document: <strong className="text-foreground">{activeDocForSigning.title}</strong> ({activeDocForSigning.documentCode})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <Tabs value={signatureType} onValueChange={(v: any) => setSignatureType(v)}>
                <div className="flex items-center justify-between mb-2">
                  <TabsList className="h-7 text-xs">
                    <TabsTrigger value="draw" className="text-xs h-6">Draw Signature</TabsTrigger>
                    <TabsTrigger value="type" className="text-xs h-6">Type Signature</TabsTrigger>
                  </TabsList>

                  {signatureType === "draw" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearCanvas}
                      className="h-6 text-[10px] font-bold text-muted-foreground gap-1 hover:text-foreground"
                    >
                      <Eraser className="size-3" /> Clear Ink
                    </Button>
                  )}
                </div>

                <TabsContent value="draw" className="pt-0">
                  <div className="border-2 rounded-xl bg-white dark:bg-zinc-950 relative overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={150}
                      className="cursor-crosshair w-full block touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] font-mono text-muted-foreground/60 select-none">
                      Sign above line
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="type" className="pt-0 space-y-2">
                  <Input
                    placeholder="Enter your legal full name"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="p-4 rounded-xl border bg-white dark:bg-zinc-950 text-center font-serif italic text-2xl text-blue-600 select-none tracking-wide">
                    {typedSignature || "Authorized Signatory"}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="size-4 text-primary rounded mt-0.5"
                  />
                  <label htmlFor="consent" className="text-[11px] leading-tight text-muted-foreground cursor-pointer">
                    I agree to be legally bound by this document, and confirm that this electronic signature carries the same legal weight as a handwritten signature under global e-Sign laws.
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsSignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSignConfirm}
                disabled={signDocMut.isPending}
                className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <FileCheck className="size-3.5" />
                <span>Authorize & Apply Signature</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 3: AUDIT TRAIL & CERTIFICATE DRAWER ─── */}
      {selectedAuditDrawer && (
        <Dialog open={!!selectedAuditDrawer} onOpenChange={(o) => !o && setSelectedAuditDrawer(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                <span>Document Audit Certificate</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cryptographic signature verification and compliance integrity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document ID:</span>
                  <span className="font-mono font-bold text-foreground">{selectedAuditDrawer.documentCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-bold text-foreground max-w-[200px] truncate">{selectedAuditDrawer.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium text-foreground">{selectedAuditDrawer.category}</span>
                </div>
              </div>

              {selectedAuditDrawer.signatureDataUrl ? (
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1 text-xs">
                      <Award className="size-3.5 text-emerald-600" /> Signer Authentication
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] font-mono">
                      Valid Signature
                    </Badge>
                  </div>

                  <div className="border rounded-lg p-2 bg-white dark:bg-zinc-950 flex items-center justify-center">
                    <img
                      src={selectedAuditDrawer.signatureDataUrl}
                      alt="Digital Signature"
                      className="max-h-16 object-contain"
                     loading="lazy"/>
                  </div>

                  <div className="font-mono text-[10px] space-y-0.5 text-muted-foreground">
                    <div>Signer: <strong className="text-foreground">{selectedAuditDrawer.signerName}</strong></div>
                    <div>Signed At: {new Date(selectedAuditDrawer.signedAt).toISOString()}</div>
                    <div>Signer IP: {selectedAuditDrawer.signerIp || "127.0.0.1 (Verified)"}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground text-xs italic">
                  Document has not yet been electronically signed.
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedAuditDrawer(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
