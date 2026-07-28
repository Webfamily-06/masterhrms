import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  Key,
  Upload,
  Save,
  Loader2,
  Lock,
  CheckCircle2,
  Image as ImageIcon,
  Crop,
  RotateCw,
  ZoomIn,
  FolderPlus,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/profile")({
  component: SuperProfileAdmin,
  head: () => ({ meta: [{ title: "Profile Management — Super Admin" }] }),
});

function SuperProfileAdmin() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile, isLoading } = useCurrentProfile(user);

  // Profile Form States
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Reset States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Avatar Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>("");
  const [rawFileName, setRawFileName] = useState<string>("avatar-logo.png");
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [cropShape, setCropShape] = useState<"circle" | "square">("circle");
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Step 1: Open Crop Modal when File is Picked
  function handleAvatarFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setRawFileName(file.name);
      setZoomScale(1.0);
      setRotation(0);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  }

  // Step 2: Open Crop Modal for custom URL
  function handleOpenCropForUrl() {
    if (!avatarUrl.trim()) return toast.error("Please enter or paste an avatar image URL first");
    setRawImageSrc(avatarUrl);
    setZoomScale(1.0);
    setRotation(0);
    setIsCropModalOpen(true);
  }

  // Step 3: Perform Crop, Save to Profile AND Store in Media Library
  async function handleConfirmCrop() {
    if (!rawImageSrc) return;
    setIsProcessingCrop(true);

    try {
      // 1. Create cropped image canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = rawImageSrc;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = canvasRef.current || document.createElement("canvas");
      const size = 300; // Output avatar size 300x300
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, size, size);

        if (cropShape === "circle") {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoomScale, zoomScale);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      const croppedBase64 = canvas.toDataURL("image/png");
      setAvatarUrl(croppedBase64);

      // 2. Save Avatar to Profile in Supabase
      if (user && profile) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            avatar_url: croppedBase64,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
        if (profileErr) throw profileErr;
      }

      // 3. AUTO-SAVE CROPPED AVATAR TO MEDIA LIBRARY (cms_pages slug: system-media-library)
      const { data: mediaPage } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-media-library")
        .maybeSingle();

      const existingFiles = (mediaPage?.content as any)?.files || [];
      const newMediaItem = {
        id: `m-avatar-${Date.now()}`,
        name: `Avatar Logo - ${fullName || "Super Admin"} (${rawFileName})`,
        folder: "Profile Avatars",
        category: "Client Logos",
        url: croppedBase64,
        size: `${Math.round((croppedBase64.length * 0.75) / 1024)} KB`,
        date: new Date().toISOString().split("T")[0],
      };

      await supabase.from("cms_pages").upsert({
        slug: "system-media-library",
        title: "System Media Library Assets",
        content: { files: [newMediaItem, ...existingFiles] } as any,
        published: true,
      }, { onConflict: "slug" });

      toast.success("Avatar cropped, saved to profile & stored in Media Library (Profile Avatars)!");
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      qc.invalidateQueries({ queryKey: ["realtime-media-files"] });
      setIsCropModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to crop and save avatar");
    } finally {
      setIsProcessingCrop(false);
    }
  }

  // Save Name & Profile Details
  async function handleSaveProfile() {
    if (!user || !profile) return toast.error("Session missing");
    if (!fullName.trim()) return toast.error("Display name cannot be empty");

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Profile username and avatar logo updated in real-time!");
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Security Password Reset
  async function handleChangePassword() {
    if (!newPassword) return toast.error("Please enter a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Security password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hidden Canvas for Avatar Cropping */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="border-b pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile & Security Management</h1>
          <Badge variant="secondary" className="gap-1 text-xs font-mono">
            <ShieldCheck className="size-3 text-amber-500" /> Executive Account
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Update display username, crop avatar logos with real-time preview, and manage security passwords.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Avatar & Profile Card */}
        <Card className="p-6 text-center space-y-4 md:col-span-1 shadow-xs border">
          <div className="relative size-28 mx-auto group">
            <Avatar className="size-28 border-4 border-primary/20 shadow-md">
              <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-3xl">
                {fullName ? fullName[0].toUpperCase() : "SA"}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center cursor-pointer font-bold text-xs"
            >
              <Crop className="size-5 mx-auto mb-0.5" /> Crop Logo
            </button>

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarFileSelected} className="hidden" />
          </div>

          <div>
            <h3 className="font-extrabold text-lg">{fullName || profile?.full_name || "Super Admin"}</h3>
            <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
            <Badge className="mt-2 bg-amber-500 text-white font-mono text-[10px]">
              SUPER_ADMIN ROLE
            </Badge>
          </div>
        </Card>

        {/* Right Column: Settings & Password Change */}
        <div className="space-y-6 md:col-span-2">
          {/* SECTION 1: USERNAME & AVATAR LOGO CROP */}
          <Card className="p-6 space-y-4 border shadow-xs">
            <CardHeader className="p-0 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-5 text-primary" /> Display Username & Avatar Logo Studio
              </CardTitle>
              <CardDescription className="text-xs">
                Upload image, crop avatar style, and automatically save to Media Library.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4 text-xs pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Super Admin Display Username *</Label>
                <Input
                  placeholder="e.g. Master Executive Administrator"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Email Address (Read-Only)</Label>
                <Input value={user?.email || ""} disabled className="text-xs bg-secondary/50 font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Avatar Logo Image</span>
                  <span className="text-[10px] text-muted-foreground">Cropped avatar auto-saves to Media Library</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="text-xs flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 shrink-0 text-xs font-bold">
                    <Upload className="size-3.5" /> Upload File
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="secondary" size="sm" onClick={handleOpenCropForUrl} className="gap-1.5 shrink-0 text-xs font-bold">
                      <Crop className="size-3.5 text-primary" /> Crop Image
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <CardFooter className="p-0 pt-4 border-t flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-primary font-bold gap-2 text-xs">
                {isSavingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Profile Settings
              </Button>
            </CardFooter>
          </Card>

          {/* SECTION 2: SECURITY & PASSWORD RESET */}
          <Card className="p-6 space-y-4 border shadow-xs">
            <CardHeader className="p-0 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Key className="size-5 text-amber-500" /> Security & Reset Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your security password to protect executive platform access.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4 text-xs pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Security Password *</Label>
                <Input
                  type="password"
                  placeholder="At least 6 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confirm New Password *</Label>
                <Input
                  type="password"
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <CardFooter className="p-0 pt-4 border-t flex justify-end">
              <Button onClick={handleChangePassword} disabled={isUpdatingPassword || !newPassword} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs">
                {isUpdatingPassword ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Reset & Change Password
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* AVATAR STYLE IMAGE CROP MODAL */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="size-5 text-primary" /> Avatar Style Crop Studio
            </DialogTitle>
            <DialogDescription className="text-xs">
              Zoom, rotate, and crop your logo into a high-resolution circular avatar. Saved directly to Media Library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* Shape Selector */}
            <div className="flex justify-center gap-3">
              <Button
                variant={cropShape === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => setCropShape("circle")}
                className="gap-1.5 text-xs font-bold"
              >
                <div className="size-3.5 rounded-full border-2 border-current" /> Circular Avatar
              </Button>
              <Button
                variant={cropShape === "square" ? "default" : "outline"}
                size="sm"
                onClick={() => setCropShape("square")}
                className="gap-1.5 text-xs font-bold"
              >
                <div className="size-3 rounded-xs border-2 border-current" /> Square Logo
              </Button>
            </div>

            {/* Interactive Image Crop Frame */}
            <div className="relative size-60 mx-auto border-2 border-dashed border-primary/50 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center">
              {rawImageSrc ? (
                <div
                  className="transition-transform duration-100 size-full flex items-center justify-center"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    ref={cropImageRef}
                    src={rawImageSrc}
                    alt="Raw Avatar"
                    className={`size-full object-cover ${cropShape === "circle" ? "rounded-full" : "rounded-none"}`}
                  />
                </div>
              ) : (
                <ImageIcon className="size-10 text-muted-foreground opacity-40" />
              )}

              {/* Crop Mask Overlay Ring */}
              <div
                className={`absolute inset-0 border-4 border-primary/80 pointer-events-none ${
                  cropShape === "circle" ? "rounded-full" : "rounded-2xl"
                }`}
              />
            </div>

            {/* Controls: Zoom & Rotate */}
            <div className="space-y-3 bg-secondary/30 p-3 rounded-xl border">
              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-xs">
                  <span className="flex items-center gap-1"><ZoomIn className="size-3.5 text-primary" /> Zoom Level</span>
                  <span className="font-mono">{zoomScale.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[zoomScale]}
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  onValueChange={(val) => setZoomScale(val[0])}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-xs flex items-center gap-1">
                  <RotateCw className="size-3.5 text-primary" /> Rotation ({rotation}°)
                </span>
                <Button variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)} className="h-7 text-xs gap-1">
                  <RotateCw className="size-3" /> Rotate 90°
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCrop} disabled={isProcessingCrop} className="bg-primary font-bold gap-2">
              {isProcessingCrop ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Confirm & Save to Media Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
