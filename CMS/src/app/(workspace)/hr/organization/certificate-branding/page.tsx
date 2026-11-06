"use client";

import { useState } from "react";
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
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CertificateBrandingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assets");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);

  // Asset Upload Form State
  const [assetType, setAssetType] = useState("LOGO_PRIMARY");
  const [assetName, setAssetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Signatory Form State
  const [sigName, setSigName] = useState("");
  const [sigDesignation, setSigDesignation] = useState("");
  const [sigDepartment, setSigDepartment] = useState("");
  const [sigType, setSigType] = useState("HR_MANAGER");
  const [sigFile, setSigFile] = useState<File | null>(null);

  // Fetch Branding Assets
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["cms-certificate-branding-assets"],
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
    queryKey: ["cms-certificate-signatories"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/signatories", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load signatories.");
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
    onSuccess: () => {
      toast.success("Branding asset uploaded successfully!");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setAssetName("");
      queryClient.invalidateQueries({ queryKey: ["cms-certificate-branding-assets"] });
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
      if (!res.ok) throw new Error("Failed to deactivate asset.");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Asset deactivated.");
      queryClient.invalidateQueries({ queryKey: ["cms-certificate-branding-assets"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Create Signatory Mutation
  const createSignatoryMutation = useMutation({
    mutationFn: async () => {
      if (!sigName || !sigDesignation) throw new Error("Signatory name and designation required.");
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");

      let signatureAssetId: string | undefined = undefined;
      if (sigFile) {
        const formData = new FormData();
        formData.append("file", sigFile);
        formData.append("assetType", "SIGNATURE");
        formData.append("assetName", `${sigName} Signature`);

        const uploadRes = await fetch("/api/certificate-studio/branding", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          signatureAssetId = uploadJson.asset?.id;
        }
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
      toast.success("Signatory authorized and added successfully!");
      setIsSignatoryModalOpen(false);
      setSigName("");
      setSigDesignation("");
      setSigDepartment("");
      setSigFile(null);
      queryClient.invalidateQueries({ queryKey: ["cms-certificate-signatories"] });
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
      queryClient.invalidateQueries({ queryKey: ["cms-certificate-signatories"] });
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
            Manage organization logos, official seals, watermarks, corporate color schemes, and authorized digital signatories.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              {assets.map((asset: any) => (
                <div key={asset.id} className="border rounded-xl p-5 bg-card hover:shadow-sm transition-all space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {asset.assetType.replace("_", " ")}
                      </span>
                      <h4 className="font-semibold text-base mt-2">{asset.assetName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {(asset.fileSize / 1024).toFixed(1)} KB • {asset.mimeType}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAssetMutation.mutate(asset.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="h-32 border rounded-lg bg-muted/10 flex items-center justify-center p-3 overflow-hidden">
                    {asset.mimeType.includes("image") ? (
                      <img src={`/api/uploads/${asset.storagePath}`} alt={asset.assetName} className="max-h-full object-contain" />
                    ) : (
                      <div className="text-center text-xs text-muted-foreground">
                        <FileCheck className="h-8 w-8 text-primary mx-auto mb-1" />
                        PDF Background
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
              {signatories.map((sig: any) => (
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
                  </div>

                  {/* Signature Image Preview */}
                  <div className="h-20 border rounded-lg bg-muted/10 flex items-center justify-center p-2">
                    {sig.signatureAsset ? (
                      <img
                        src={`/api/uploads/${sig.signatureAsset.storagePath}`}
                        alt="Signature"
                        className="max-h-full object-contain filter contrast-125"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Digital Authority Sign-off</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Effective: {new Date(sig.effectiveFrom).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleAuthMutation.mutate({
                          id: sig.id,
                          status: sig.authorizationStatus === "AUTHORIZED" ? "REVOKED" : "AUTHORIZED"
                        })
                      }
                      className="text-xs h-7 px-2"
                    >
                      {sig.authorizationStatus === "AUTHORIZED" ? "Revoke" : "Authorize"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Certificate Branding Asset</DialogTitle>
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
                  <SelectItem value="LOGO_SECONDARY">Secondary Organization Logo</SelectItem>
                  <SelectItem value="OFFICIAL_SEAL">Organization Official Seal</SelectItem>
                  <SelectItem value="WATERMARK">Certificate Watermark</SelectItem>
                  <SelectItem value="BACKGROUND">Certificate Background Artwork</SelectItem>
                  <SelectItem value="SIGNATURE">General Signature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                placeholder="e.g. MasterHRMS Gold Official Seal"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>File (PNG, JPEG, WEBP, SVG, PDF up to 5MB)</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
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
              {uploadAssetMutation.isPending ? "Uploading..." : "Upload Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Signatory Modal */}
      <Dialog open={isSignatoryModalOpen} onOpenChange={setIsSignatoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Authorized Signatory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Signatory Full Name *</Label>
              <Input
                placeholder="e.g. Dr. Arthur Pendelton"
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Designation / Title *</Label>
              <Input
                placeholder="e.g. Chief Executive Officer"
                value={sigDesignation}
                onChange={(e) => setSigDesignation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Executive Leadership"
                value={sigDepartment}
                onChange={(e) => setSigDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Signatory Role</Label>
              <Select value={sigType} onValueChange={setSigType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                  <SelectItem value="HR_DIRECTOR">HR Director</SelectItem>
                  <SelectItem value="CEO">Chief Executive Officer / MD</SelectItem>
                  <SelectItem value="AUTHORIZED_OFFICER">Authorized Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Digital Signature Image (Optional PNG/SVG)</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                onChange={(e) => setSigFile(e.target.files?.[0] || null)}
              />
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
              {createSignatoryMutation.isPending ? "Adding..." : "Authorize Signatory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

