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
  Mail,
  Building2,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Avatar Image File Upload
  function handleAvatarFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Url = ev.target?.result as string;
      setAvatarUrl(base64Url);
      toast.success(`Avatar logo "${file.name}" selected! Click "Save Profile Settings" to apply.`);
    };
    reader.readAsDataURL(file);
  }

  // Handle Profile Update (Username & Avatar Logo)
  async function handleSaveProfile() {
    if (!user || !profile) return toast.error("Session missing");
    if (!fullName.trim()) return toast.error("Display name / username cannot be empty");

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

  // Handle Security Password Reset / Change
  async function handleChangePassword() {
    if (!newPassword) return toast.error("Please enter a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Security password updated successfully! Please use your new password next time you login.");
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
      {/* Header */}
      <div className="border-b pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile & Security Management</h1>
          <Badge variant="secondary" className="gap-1 text-xs font-mono">
            <ShieldCheck className="size-3 text-amber-500" /> Executive Account
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Update display username, upload avatar logos, and change your executive security password.
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
              <Upload className="size-5 mx-auto mb-0.5" /> Upload Logo
            </button>

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
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
          {/* SECTION 1: USERNAME & AVATAR LOGO SETTINGS */}
          <Card className="p-6 space-y-4 border shadow-xs">
            <CardHeader className="p-0 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-5 text-primary" /> Display Username & Avatar Logo
              </CardTitle>
              <CardDescription className="text-xs">
                Change your executive username and set profile avatar logo URL or file.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4 text-xs pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Super Admin Display Username / Full Name *</Label>
                <Input
                  placeholder="e.g. Master Executive Administrator"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Email Address (Read-Only)</Label>
                <div className="flex items-center">
                  <Input value={user?.email || ""} disabled className="text-xs bg-secondary/50 font-mono" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Avatar Logo URL / Upload</span>
                  <span className="text-[10px] text-muted-foreground">Upload file or paste image URL</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="text-xs flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 shrink-0 text-xs">
                    <Upload className="size-3.5" /> Upload File
                  </Button>
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
    </div>
  );
}
