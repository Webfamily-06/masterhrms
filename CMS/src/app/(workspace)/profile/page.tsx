'use client';

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, clearToken } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Information state
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");

  // Change Password + Email OTP state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<{ maskedEmail?: string; devOtp?: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // Two-Factor Authentication state
  const [totpSetup, setTotpSetup] = useState<{ qrCode?: string; secret?: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const { data: authUser, isLoading } = useQuery({
    queryKey: ["auth-me-profile"],
    queryFn: async () => {
      const res: any = await api.get("/auth/me");
      return res?.user || res?.data || res || null;
    },
  });

  const { data: twoFaStatus } = useQuery({
    queryKey: ["auth-2fa-status"],
    queryFn: async () => {
      const res: any = await api.get("/auth/2fa/status");
      return res?.data || res || { twoFactorEnabled: false };
    },
  });

  const avatarUrl: string | null = authUser?.profile?.avatarUrl || authUser?.avatar_url || null;
  const tenantSlug: string = authUser?.tenant?.slug || authUser?.profile?.tenantSlug || "";
  const is2faEnabled = Boolean(twoFaStatus?.twoFactorEnabled || authUser?.twoFactorEnabled);

  useEffect(() => {
    if (!authUser) return;
    setNameInput(authUser?.profile?.fullName || authUser?.full_name || authUser?.email?.split("@")[0] || "");
    setEmailInput(authUser?.email || "");
    setMobileInput(authUser?.profile?.phone || authUser?.phone || "");
    if (avatarUrl) {
      const parts = avatarUrl.split("/");
      setAvatarFileName(parts[parts.length - 1] || "avatar.png");
    } else {
      setAvatarFileName("");
    }
  }, [authUser, avatarUrl]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["auth-me-profile"] });
    queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    queryClient.invalidateQueries({ queryKey: ["auth-2fa-status"] });
  };

  const forceLogoutToLogin = (message: string) => {
    toast.success(message);
    clearToken();
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("master_hrms_token");
      localStorage.removeItem("hrms_tenant_impersonation_active");
      localStorage.removeItem("hrms_tenant_admin_backup_token");
    } catch {}
    setTimeout(() => {
      window.location.href = "/login";
    }, 900);
  };

  // 1. Update Profile Information
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!nameInput.trim()) throw new Error("Name is required.");
      if (!emailInput.trim() || !emailInput.includes("@")) throw new Error("Valid Email is required.");
      return await api.put("/auth/profile", {
        fullName: nameInput.trim(),
        email: emailInput.trim(),
        phone: mobileInput.trim() || null,
      });
    },
    onSuccess: (res: any) => {
      const payload = res?.data || res || {};
      if (payload.requireRelogin) {
        forceLogoutToLogin("Email updated! Signing you out — please log in with your new email.");
        return;
      }
      toast.success("Profile information updated successfully.");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update profile.");
    },
  });

  // 2. Upload / Remove Avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageDataUrl: string) =>
      api.post("/auth/profile/avatar", { imageDataUrl }),
    onSuccess: () => {
      toast.success("Profile picture updated.");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to upload profile picture.");
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => api.delete("/auth/profile/avatar"),
    onSuccess: () => {
      setAvatarFileName("");
      toast.success("Profile picture removed.");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to remove profile picture.");
    },
  });

  const handleAvatarFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be 3 MB or smaller.");
      return;
    }
    setAvatarFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        uploadAvatarMutation.mutate(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 3. Request Email OTP & Change Password
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword.trim()) throw new Error("Enter your current password first.");
      return await api.post("/auth/change-password/request-otp", {
        currentPassword: currentPassword.trim(),
      });
    },
    onSuccess: (res: any) => {
      const payload = res?.data || res || {};
      setOtpInfo({ maskedEmail: payload.maskedEmail, devOtp: payload.devOtp });
      toast.success(payload.message || "Verification OTP sent to your registered email.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to send verification OTP.");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword.trim()) throw new Error("Current Password is required.");
      if (newPassword.trim().length < 6) throw new Error("New Password must be at least 6 characters.");
      if (newPassword !== confirmPassword) throw new Error("New Password and Confirm Password do not match.");
      if (!otpCode.trim()) throw new Error("Please click 'Send OTP' and enter the 6-digit email verification code.");
      return await api.post("/auth/change-password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        otp: otpCode.trim(),
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setOtpInfo(null);
      forceLogoutToLogin("Password updated! Signing you out — please log in with your new password.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to change password.");
    },
  });

  // 4. Two-Factor Authentication (Google Authenticator TOTP)
  const generateSecretMutation = useMutation({
    mutationFn: async () => api.post("/auth/2fa/totp/initiate", {}),
    onSuccess: (res: any) => {
      const raw = res?.data || res || {};
      setTotpSetup({
        qrCode: raw.qrCode || raw.qrCodeDataUrl,
        secret: raw.secret || raw.manualEntryKey,
      });
      toast.success("Secret key generated. Scan the QR code with Google Authenticator.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to generate 2FA secret key.");
    },
  });

  const confirmTotpMutation = useMutation({
    mutationFn: async () => {
      if (totpVerifyCode.trim().length < 6) {
        throw new Error("Enter the 6-digit code from Google Authenticator.");
      }
      return await api.post("/auth/2fa/totp/confirm", { code: totpVerifyCode.trim() });
    },
    onSuccess: () => {
      toast.success("Two-Factor Authentication enabled.");
      setTotpSetup(null);
      setTotpVerifyCode("");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Invalid verification code.");
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: async () => {
      if (!disablePassword.trim() && !disableCode.trim()) {
        throw new Error("Enter your account password or a 6-digit authenticator code to disable 2FA.");
      }
      return await api.post("/auth/2fa/disable", {
        password: disablePassword.trim() || undefined,
        code: disableCode.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Two-Factor Authentication disabled.");
      setDisablePassword("");
      setDisableCode("");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to disable 2FA.");
    },
  });

  if (isLoading) {
    return (
      <div className="w-full p-16 text-center text-xs text-muted-foreground">
        <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
        Loading profile settings...
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-6">
      <PageHeader
        title="Profile Settings"
        description="Manage your personal information, password security, and two-factor authentication."
      />

      {/* Top 2-Column Split: Profile Information | Change Password (Matches Screenshot 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: Profile Information */}
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <div className="px-6 py-4 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">Profile Information</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Details about your personal information
            </p>
          </div>
          <CardContent className="p-6 space-y-4">
            {/* Avatar Upload Row */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Avatar</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="size-16 rounded-xl border border-border/80 bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={nameInput} className="size-full object-cover" />
                  ) : (
                    <i className="ph-duotone ph-user text-3xl text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={avatarFileName || "No file chosen"}
                      className="h-9 text-xs bg-muted/30 flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarFilePick}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadAvatarMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 text-xs gap-1.5 shrink-0"
                    >
                      <i className="ph ph-image text-sm" />
                      Browse
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={removeAvatarMutation.isPending}
                        onClick={() => removeAvatarMutation.mutate()}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-rose-600"
                        title="Remove Avatar"
                      >
                        <i className="ph ph-x text-sm" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a profile picture. Recommended size: 200x200px
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="h-10 text-xs"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@company.com"
                className="h-10 text-xs"
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                placeholder="+919876543210"
                className="h-10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Format: +[country code][phone number]
              </p>
            </div>

            {/* URL Slug */}
            {tenantSlug && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL Slug</Label>
                <Input
                  readOnly
                  value={tenantSlug}
                  className="h-10 text-xs bg-muted/35 text-muted-foreground"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                disabled={updateProfileMutation.isPending}
                onClick={() => updateProfileMutation.mutate()}
                className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {updateProfileMutation.isPending && <i className="ph ph-spinner-gap animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Change Password */}
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Details about your account password change
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
            >
              <i className={showPasswords ? "ph ph-eye-slash" : "ph ph-eye"} />
              {showPasswords ? "Hide" : "Show"}
            </button>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Current Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                New Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Confirm Password</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-10 text-xs"
              />
            </div>

            {/* Email OTP Verification */}
            <div className="rounded-lg border border-border/70 bg-muted/25 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Email OTP Verification</p>
                  <p className="text-[11px] text-muted-foreground">
                    {otpInfo?.maskedEmail
                      ? `OTP sent to ${otpInfo.maskedEmail}`
                      : "Verify your identity via email OTP before updating password."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={requestOtpMutation.isPending}
                  onClick={() => requestOtpMutation.mutate()}
                  className="h-8 text-xs gap-1.5"
                >
                  <i className={requestOtpMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-paper-plane-tilt"} />
                  {otpInfo ? "Resend OTP" : "Send OTP"}
                </Button>
              </div>
              {otpInfo && (
                <div className="space-y-1">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    className="h-9 text-xs"
                  />
                  {otpInfo.devOtp && (
                    <p className="text-[11px] text-primary font-medium">
                      Dev OTP: {otpInfo.devOtp}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                disabled={changePasswordMutation.isPending}
                onClick={() => changePasswordMutation.mutate()}
                className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {changePasswordMutation.isPending && <i className="ph ph-spinner-gap animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Full-Width Card: Two-Factor Authentication (Matches Screenshot 2) */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Two-Factor Authentication</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add an extra layer of security to your account
            </p>
          </div>
          {is2faEnabled && (
            <Badge variant="success" className="text-xs px-2.5 py-0.5">
              <i className="ph-fill ph-check-circle mr-1" />
              Enabled
            </Badge>
          )}
        </div>

        <CardContent className="p-8">
          {is2faEnabled ? (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex items-start gap-3">
                <i className="ph-duotone ph-shield-check text-2xl text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Two-Factor Authentication is Active</p>
                  <p className="text-muted-foreground mt-0.5">
                    Your account is protected with two-factor authentication. To disable it, confirm with your password or a 6-digit authenticator code below.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Password</Label>
                  <Input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter account password"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Or 6-Digit 2FA Code</Label>
                  <Input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="123456"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={disable2faMutation.isPending}
                  onClick={() => disable2faMutation.mutate()}
                  className="h-9 text-xs gap-1.5"
                >
                  {disable2faMutation.isPending && <i className="ph ph-spinner-gap animate-spin" />}
                  Disable Two-Factor Authentication
                </Button>
              </div>
            </div>
          ) : totpSetup ? (
            <div className="max-w-lg mx-auto space-y-5 text-center">
              <p className="text-sm font-bold text-foreground">
                Scan QR Code with Google Authenticator
              </p>
              {totpSetup.qrCode && (
                <div className="inline-block p-3 bg-white rounded-xl border border-border shadow-xs">
                  <img src={totpSetup.qrCode} alt="2FA QR Code" className="size-44 object-contain" />
                </div>
              )}
              {totpSetup.secret && (
                <div className="rounded-lg border border-border/80 bg-muted/35 p-3 text-xs flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-foreground">{totpSetup.secret}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(totpSetup.secret || "");
                      toast.success("Secret key copied.");
                    }}
                    className="h-7 text-[11px] shrink-0"
                  >
                    Copy Key
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <Input
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  className="h-9 text-xs text-center tracking-widest"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={confirmTotpMutation.isPending}
                  onClick={() => confirmTotpMutation.mutate()}
                  className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                >
                  Verify &amp; Enable
                </Button>
              </div>
            </div>
          ) : (
            /* Centered Empty State matching Screenshot 2 */
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <i className="ph ph-shield text-2xl" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Secure Your Account</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Add an extra layer of security with two-factor authentication using Google Authenticator
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={generateSecretMutation.isPending}
                onClick={() => generateSecretMutation.mutate()}
                className="h-9 px-5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 mt-1"
              >
                {generateSecretMutation.isPending && <i className="ph ph-spinner-gap animate-spin" />}
                Generate Secret Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
