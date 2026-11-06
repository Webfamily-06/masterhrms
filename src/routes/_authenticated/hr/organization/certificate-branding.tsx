import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldCheck,
  FileCheck,
  Palette,
  Image as ImageIcon,
  PenTool,
  Loader2,
  FolderOpen,
  RefreshCw,
  Eye,
  AlertTriangle,
  ExternalLink,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getCertificateAssetPreviewUrl, getSignatorySignaturePreviewUrl } from "@/lib/certificate-asset-resolver";

export const Route = createFileRoute("/_authenticated/hr/organization/certificate-branding")({
  component: CertificateBrandingPage,
});

function CertificateBrandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assets");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [assetToReplace, setAssetToReplace] = useState<any | null>(null);
  const [previewModalAsset, setPreviewModalAsset] = useState<any | null>(null);

  // Asset Upload Form State
  const [assetType, setAssetType] = useState("LOGO_PRIMARY");
  const [assetName, setAssetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Replace Asset Form State
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  // Signatory Form State
  const [sigName, setSigName] = useState("");
  const [sigDesignation, setSigDesignation] = useState("");
  const [sigDepartment, setSigDepartment] = useState("");
  const [sigType, setSigType] = useState("HR_MANAGER");
  const [sigFile, setSigFile] = useState<File | null>(null);

  // Image load error state map
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Fetch Branding Assets
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["certificate-branding-assets"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/branding", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load branding assets.");
      return res.json();
    }
  });

  // Fetch Signatories
  const { data: signatoriesData, isLoading: signatoriesLoading } = useQuery({
    queryKey: ["certificate-signatories"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/signatories", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load signatories.");
      return res.json();
    }
  });

  // Fetch Certificates Folder Hierarchy
  const { data: foldersData } = useQuery({
    queryKey: ["certificates-folders"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/folders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    }
  });

  // Upload Asset Mutation
  const uploadAssetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !assetName) throw new Error("Please fill all required fields.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("assetType", assetType);
      formData.append("assetName", assetName);

      const res = await fetch("/api/certificate-studio/branding", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.asset?.reused) {
        toast.info("Identical file detected in File Manager. Reused existing asset reference safely.");
      } else {
        toast.success("Branding asset uploaded and stored in Certificates/Branding!");
      }
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setAssetName("");
      queryClient.invalidateQueries({ queryKey: ["certificate-branding-assets"] });
      queryClient.invalidateQueries({ queryKey: ["certificates-folders"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Replace Asset Mutation
  const replaceAssetMutation = useMutation({
    mutationFn: async () => {
      if (!replaceFile || !assetToReplace) throw new Error("Please select a replacement file.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", replaceFile);
      formData.append("oldAssetId", assetToReplace.id);
      formData.append("assetType", assetToReplace.assetType);
      formData.append("assetName", assetToReplace.assetName);

      const res = await fetch("/api/certificate-studio/branding/replace", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Replacement failed.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Asset replaced successfully. Historical references preserved.");
      setIsReplaceModalOpen(false);
      setReplaceFile(null);
      setAssetToReplace(null);
      queryClient.invalidateQueries({ queryKey: ["certificate-branding-assets"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Delete Asset Mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/certificate-studio/branding/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        const error: any = new Error(err.error || "Failed to deactivate asset.");
        error.code = err.code;
        error.references = err.references;
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Asset deleted safely from File Manager.");
      queryClient.invalidateQueries({ queryKey: ["certificate-branding-assets"] });
    },
    onError: (err: any) => {
      if (err.status === 409 || err.code === "CERTIFICATE_ASSET_IN_USE") {
        toast.error(err.message, { duration: 6000 });
      } else {
        toast.error(err.message || "Failed to delete asset.");
      }
    }
  });

  // Create Signatory Mutation
  const createSignatoryMutation = useMutation({
    mutationFn: async () => {
      if (!sigName || !sigDesignation) throw new Error("Name and designation are required.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");

      let signatureAssetId: string | undefined = undefined;
      if (sigFile) {
        const formData = new FormData();
        formData.append("file", sigFile);
        formData.append("assetType", "SIGNATURE");
        formData.append("assetName", `${sigName} Digital Signature`);

        const uploadRes = await fetch("/api/certificate-studio/branding", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Failed to upload signature image.");
        }
        const uploadedData = await uploadRes.json();
        signatureAssetId = uploadedData.asset.id;
      }

      const res = await fetch("/api/certificate-studio/signatories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: sigName,
          designation: sigDesignation,
          department: sigDepartment || undefined,
          signatoryType: sigType,
          signatureAssetId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create signatory.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Signatory authorized and stored in Certificates/Signatures!");
      setIsSignatoryModalOpen(false);
      setSigName("");
      setSigDesignation("");
      setSigDepartment("");
      setSigFile(null);
      queryClient.invalidateQueries({ queryKey: ["certificate-signatories"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-branding-assets"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Toggle Authorization Mutation
  const toggleAuthMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/certificate-studio/signatories/${id}/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status.");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Signatory authorization updated.");
      queryClient.invalidateQueries({ queryKey: ["certificate-signatories"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const assets = assetsData?.assets || [];
  const signatories = signatoriesData?.signatories || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Certificate Branding & Signatory Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise unified storage layer for logos, official seals, watermarks, background artwork, and authorized signatories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/hr/files" })}
            className="flex items-center gap-2 border-primary/20 hover:bg-primary/5"
          >
            <FolderOpen className="h-4 w-4 text-primary" />
            Open File Manager
          </Button>

          {activeTab === "assets" ? (
            <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Branding Asset
            </Button>
          ) : (
            <Button onClick={() => setIsSignatoryModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Authorized Signatory
            </Button>
          )}
        </div>
      </div>

      {/* System Storage Indicator Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Protected System Folder Hierarchy Active
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                Unified File Manager
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Certificates / Branding • Certificates / Signatures • Certificates / Templates • Certificates / Generated
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right hidden sm:block">
          <span>Protected from deletion and renaming</span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Branding Assets ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="signatories" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Signatories ({signatories.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Branding Assets */}
        <TabsContent value="assets" className="space-y-6">
          {assetsLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading organization branding assets...
            </div>
          ) : assets.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center space-y-3 bg-muted/20">
              <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base">No branding assets uploaded yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upload your primary and secondary organization logos, official gold seals, and watermarks to use inside certificates.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="mt-2">
                Upload First Asset
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset: any) => {
                const previewUrl = getCertificateAssetPreviewUrl(asset.id, asset.fileId, asset.storagePath);
                const hasError = imageErrors[asset.id];
                const isImage = (asset.mimeType || "").includes("image") || (asset.storagePath || "").endsWith(".svg") || (asset.storagePath || "").endsWith(".png");

                return (
                  <div key={asset.id} className="border rounded-xl p-5 bg-card hover:shadow-sm transition-all space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {asset.assetType.replace("_", " ")}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                            Certificates/Branding
                          </span>
                        </div>
                        <h4 className="font-semibold text-base mt-2">{asset.assetName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {(asset.fileSize / 1024).toFixed(1)} KB • {asset.mimeType}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Preview full asset"
                          onClick={() => setPreviewModalAsset(asset)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Replace asset"
                          onClick={() => {
                            setAssetToReplace(asset);
                            setIsReplaceModalOpen(true);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete asset"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${asset.assetName}"? If referenced by active certificates or signatories, deletion will be blocked.`)) {
                              deleteAssetMutation.mutate(asset.id);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Image Preview with Canonical Resolver */}
                    <div
                      onClick={() => setPreviewModalAsset(asset)}
                      className="h-32 border rounded-lg bg-muted/10 flex items-center justify-center p-3 overflow-hidden cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      {isImage && !hasError ? (
                        <img
                          src={previewUrl}
                          alt={asset.assetName}
                          onError={() => handleImageError(asset.id)}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : isImage && hasError ? (
                        <div className="text-center text-xs text-muted-foreground space-y-1">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="font-medium text-[11px]">{asset.assetName}</p>
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Asset Stored in File Manager</span>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground">
                          <FileCheck className="h-8 w-8 text-primary mx-auto mb-1" />
                          PDF Document Asset
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3 text-primary" />
                        File ID: {asset.fileId ? asset.fileId.substring(0, 8) + "..." : "Canonical"}
                      </span>
                      <button
                        onClick={() => navigate({ to: "/hr/files" })}
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        View in Files <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Signatories */}
        <TabsContent value="signatories" className="space-y-6">
          {signatoriesLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading authorized signatories...
            </div>
          ) : signatories.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center space-y-3 bg-muted/20">
              <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base">No authorized signatories configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Add HR Managers, Managing Directors, or CEOs with digital signatures to authorize certificates.
              </p>
              <Button onClick={() => setIsSignatoryModalOpen(true)} variant="outline" className="mt-2">
                Add Authorized Signatory
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signatories.map((sig: any) => {
                const sigPreviewUrl = getSignatorySignaturePreviewUrl(sig.id, sig.signatureAssetId);
                const hasError = imageErrors[`sig-${sig.id}`];

                return (
                  <div key={sig.id} className="border rounded-xl p-5 bg-card hover:shadow-sm transition-all space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {sig.signatoryType.replace("_", " ")}
                          </span>
                          {sig.authorizationStatus === "AUTHORIZED" ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Authorized
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Revoked
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-base mt-2">{sig.name}</h4>
                        <p className="text-xs text-muted-foreground font-medium">{sig.designation}</p>
                        {sig.department && <p className="text-xs text-muted-foreground">{sig.department}</p>}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleAuthMutation.mutate({
                            id: sig.id,
                            status: sig.authorizationStatus === "AUTHORIZED" ? "REVOKED" : "AUTHORIZED"
                          })
                        }
                      >
                        {sig.authorizationStatus === "AUTHORIZED" ? "Revoke" : "Authorize"}
                      </Button>
                    </div>

                    {/* Signature Image Preview */}
                    <div className="h-20 border rounded-lg bg-muted/10 flex items-center justify-center p-2">
                      {sig.signatureAsset && !hasError ? (
                        <img
                          src={sigPreviewUrl}
                          alt="Signature"
                          onError={() => handleImageError(`sig-${sig.id}`)}
                          className="max-h-full object-contain filter contrast-125"
                        />
                      ) : sig.signatureAsset && hasError ? (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <PenTool className="h-3.5 w-3.5 text-primary" /> Stored in Certificates/Signatures
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Digital Authority Sign-off</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                      <span className="font-mono">Certificates/Signatures</span>
                      <button
                        onClick={() => navigate({ to: "/hr/files" })}
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        View in Files <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Upload Branding Asset */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Branding Asset</DialogTitle>
            <DialogDescription>
              Assets are automatically validated and organized into the protected Certificates/Branding File Manager folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOGO_PRIMARY">Primary Organization Logo</SelectItem>
                  <SelectItem value="LOGO_SECONDARY">Secondary Logo / Subsidiary</SelectItem>
                  <SelectItem value="SEAL">Official Gold Seal / Stamp</SelectItem>
                  <SelectItem value="WATERMARK">Security Watermark</SelectItem>
                  <SelectItem value="BORDER">Certificate Border Artwork</SelectItem>
                  <SelectItem value="BACKGROUND">Background Artwork / Texture</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Display Name</Label>
              <Input
                placeholder="e.g. MasterHRMS Gold Foil Seal 2026"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Asset File (PNG, JPEG, WEBP, SVG, max 5MB)</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-[11px] text-muted-foreground">
                SVGs are automatically scanned and sanitized to prevent script execution vulnerabilities.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadAssetMutation.mutate()}
              disabled={uploadAssetMutation.isPending || !selectedFile || !assetName}
            >
              {uploadAssetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload to File Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Replace Asset */}
      <Dialog open={isReplaceModalOpen} onOpenChange={setIsReplaceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Branding Asset</DialogTitle>
            <DialogDescription>
              Upload a new version for "{assetToReplace?.assetName}". Historical certificates will safely retain their rendered design snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">Current Asset: {assetToReplace?.assetName}</p>
              <p className="text-muted-foreground">Type: {assetToReplace?.assetType?.replace("_", " ")}</p>
              <p className="text-muted-foreground font-mono">Location: Certificates/Branding</p>
            </div>

            <div className="space-y-2">
              <Label>Select New File</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplaceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => replaceAssetMutation.mutate()}
              disabled={replaceAssetMutation.isPending || !replaceFile}
            >
              {replaceAssetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Full Asset Preview */}
      <Dialog open={!!previewModalAsset} onOpenChange={() => setPreviewModalAsset(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewModalAsset?.assetName}</DialogTitle>
            <DialogDescription>
              {previewModalAsset?.assetType?.replace("_", " ")} • {previewModalAsset?.mimeType} • {(previewModalAsset?.fileSize / 1024).toFixed(1)} KB
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center bg-muted/10 border rounded-xl min-h-[300px] max-h-[500px] overflow-hidden p-4">
            {previewModalAsset && (
              <img
                src={getCertificateAssetPreviewUrl(previewModalAsset.id, previewModalAsset.fileId, previewModalAsset.storagePath)}
                alt={previewModalAsset.assetName}
                className="max-h-[450px] max-w-full object-contain"
              />
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="text-xs text-muted-foreground font-mono">
              Folder: Certificates/Branding
            </div>
            <Button variant="outline" onClick={() => setPreviewModalAsset(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Authorized Signatory */}
      <Dialog open={isSignatoryModalOpen} onOpenChange={setIsSignatoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Authorized Signatory</DialogTitle>
            <DialogDescription>
              Digital signatures are stored securely in Certificates/Signatures and are reference-protected against accidental deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Dr. Eleanor Vance"
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Designation / Official Title</Label>
              <Input
                placeholder="e.g. Chief People Officer"
                value={sigDesignation}
                onChange={(e) => setSigDesignation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Input
                placeholder="e.g. Human Resources & People Operations"
                value={sigDepartment}
                onChange={(e) => setSigDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Signatory Authority Type</Label>
              <Select value={sigType} onValueChange={setSigType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HR_MANAGER">HR Manager / People Head</SelectItem>
                  <SelectItem value="DIRECTOR">Director / VP of Engineering</SelectItem>
                  <SelectItem value="CEO">Chief Executive Officer / MD</SelectItem>
                  <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transparent PNG Digital Signature (Max 2MB)</Label>
              <Input
                type="file"
                accept="image/png,image/svg+xml,image/webp"
                onChange={(e) => setSigFile(e.target.files?.[0] || null)}
              />
              <p className="text-[11px] text-muted-foreground">
                For best results on certificates, upload a clean signature on a transparent background.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignatoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createSignatoryMutation.mutate()}
              disabled={createSignatoryMutation.isPending || !sigName || !sigDesignation}
            >
              {createSignatoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Authorize & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
