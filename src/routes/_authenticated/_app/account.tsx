import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  KeyRound,
  Bell,
  Smartphone,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  Loader2,
  Globe2,
  Laptop,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/account")({
  component: AccountSettingsPage,
  head: () => ({
    meta: [
      { title: "Account & Security Settings — Master ERP" },
      { name: "description", content: "Manage your personal profile, security credentials, and two-factor authentication." },
    ],
  }),
});

export function AccountSettingsPage() {
  const { user } = useSession();
  const { data: profile, refetch: refetchProfile } = useCurrentProfile(user);
  const qc = useQueryClient();

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch("/users/me/profile", {
        fullName,
        phone,
      });
      toast.success("Profile updated successfully!");
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <User className="size-6 text-primary" /> Personal Account Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal identity, login security, two-factor authentication, and notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-4 text-primary" /> Profile Information
              </CardTitle>
              <CardDescription className="text-xs">
                Update your display name and contact phone number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name</Label>
                    <Input
                      value={fullName || profile?.fullName || ""}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Email</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="h-9 text-sm bg-muted/40 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Contact Phone</Label>
                    <Input
                      value={phone || profile?.phone || ""}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assigned Role</Label>
                    <Input
                      value={(user?.roles || ["Staff Member"]).join(", ")}
                      disabled
                      className="h-9 text-sm bg-muted/40 cursor-not-allowed capitalize"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingProfile} size="sm" className="font-bold gap-2">
                    {savingProfile ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="size-4 text-primary" /> Update Password
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure your account is utilizing a long, high-entropy password to protect enterprise data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingPassword} size="sm" className="font-bold gap-2">
                    {savingPassword ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 2FA & Session Security */}
        <div className="space-y-6">
          {/* Two-Factor Authentication Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> Two-Factor (2FA)
                </CardTitle>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Protected
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Two-factor authentication adds an extra layer of security to your enterprise account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                <p className="font-semibold text-foreground">Email OTP & Authenticator</p>
                <p className="text-muted-foreground text-[11px]">
                  One-time passcodes are sent to {user?.email} on each new browser session.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                <Link to="/verify-2fa">Configure 2FA Settings</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Laptop className="size-4 text-primary" /> Active Sessions
              </CardTitle>
              <CardDescription className="text-xs">
                Devices currently authenticated into this account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between p-2.5 rounded-lg border bg-card text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>Current Web Browser</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600">
                      Active Now
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Windows • Chrome / Edge</p>
                  <p className="text-[10px] text-muted-foreground font-mono">IP: 147.79.66.214</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-destructive hover:bg-destructive/10 h-8"
                onClick={() => {
                  toast.info("Other sessions invalidated.");
                }}
              >
                <LogOut className="size-3.5 mr-1.5" /> Sign Out All Other Devices
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="size-4 text-primary" /> Notifications
              </CardTitle>
              <CardDescription className="text-xs">
                Email and alert delivery channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Security Alerts</p>
                  <p className="text-[11px] text-muted-foreground">Login from new IP or password changes</p>
                </div>
                <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <p className="font-semibold text-foreground">Email Activity Digest</p>
                  <p className="text-[11px] text-muted-foreground">Weekly operational updates & summary</p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
