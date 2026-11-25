'use client';

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeeProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [revealSensitive, setRevealSensitive] = useState(false);

  // Instant edit form state
  const [fullNameInput, setFullNameInput] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  // Sensitive change request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState("bank");
  const [requestFieldKey, setRequestFieldKey] = useState("bankAccount");
  const [requestNewValue, setRequestNewValue] = useState("");

  // Change Password + Email OTP state
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordOtp, setPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpRequestedInfo, setOtpRequestedInfo] = useState<{ maskedEmail?: string; devOtp?: string } | null>(null);

  // 2FA Enable / Disable state
  const [twoFaMethod, setTwoFaMethod] = useState<"email" | "totp">("email");
  const [email2faInitiated, setEmail2faInitiated] = useState<{ maskedEmail?: string; devOtp?: string } | null>(null);
  const [email2faCode, setEmail2faCode] = useState("");
  const [totpSetup, setTotpSetup] = useState<{ qrCode?: string; secret?: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [disable2faPassword, setDisable2faPassword] = useState("");
  const [disable2faCode, setDisable2faCode] = useState("");

  // 1. Fetch authenticated user account (works for ALL roles: Tenant Admin, HR, Manager, Employee)
  const { data: authMeRes, isLoading: authLoading } = useQuery({
    queryKey: ["auth-me-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res?.user || res?.data || res;
    },
  });

  // 2. Fetch 2FA status (works for ALL roles)
  const { data: twoFaStatus } = useQuery({
    queryKey: ["auth-2fa-status"],
    queryFn: async () => {
      const res = await api.get("/auth/2fa/status");
      return res?.data || res || { twoFactorEnabled: false };
    },
  });

  // 3. Fetch employee self-service profile (optional — admins without an employee row still work!)
  const { data: profileRes, isLoading: empLoading } = useQuery({
    queryKey: ["employee-profile-me"],
    queryFn: async () => {
      try {
        return await api.get("/v1/me/profile");
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const emp = profileRes?.data || null;
  const authUser = authMeRes || null;
  const displayName = emp?.fullName || authUser?.profile?.fullName || authUser?.email?.split("@")[0] || "User";
  const displayEmail = emp?.email || authUser?.email || "";
  const avatarUrl = authUser?.profile?.avatarUrl || emp?.avatarUrl || null;
  const userRoles: string[] = Array.isArray(authUser?.roles) ? authUser.roles : [];
  const is2faEnabled = Boolean(twoFaStatus?.twoFactorEnabled);

  useEffect(() => {
    if (emp) {
      setPhone(emp.phone || "");
      setGender(emp.gender || "");
    }
    if (displayName && !fullNameInput) {
      setFullNameInput(displayName);
    }
  }, [emp, displayName]);

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["auth-me-profile"] });
    queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    queryClient.invalidateQueries({ queryKey: ["employee-profile-me"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
  };

  // Avatar Upload / Replace
  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageDataUrl: string) => {
      return await api.post("/auth/profile/avatar", { imageDataUrl });
    },
    onSuccess: () => {
      toast.success("Profile photo updated successfully.");
      invalidateUserQueries();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to upload profile photo.");
    },
  });

  // Avatar Delete
  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      return await api.delete("/auth/profile/avatar");
    },
    onSuccess: () => {
      toast.success("Profile photo removed.");
      invalidateUserQueries();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove profile photo.");
    },
  });

  // Update Account Name (for non-employee accounts / general profile)
  const updateAccountProfileMutation = useMutation({
    mutationFn: async (payload: { fullName: string }) => {
      return await api.put("/auth/profile", payload);
    },
    onSuccess: () => {
      toast.success("Account display name updated.");
      invalidateUserQueries();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update account name.");
    },
  });

  // Employee contact update
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { phone?: string; gender?: string }) => {
      return await api.put("/v1/me/profile", payload);
    },
    onSuccess: () => {
      toast.success("Profile contact information updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["employee-profile-me"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update profile.");
    },
  });

  // Sensitive change request
  const submitChangeRequestMutation = useMutation({
    mutationFn: async (payload: { fieldCategory: string; fieldKey: string; newValue: string }) => {
      return await api.post("/v1/me/profile/change-requests", payload);
    },
    onSuccess: () => {
      toast.success("Change request submitted for HR approval.");
      setRequestDialogOpen(false);
      setRequestNewValue("");
      queryClient.invalidateQueries({ queryKey: ["employee-profile-me"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit change request.");
    },
  });

  // Request Email OTP for Password Change
  const requestPasswordOtpMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/change-password/request-otp", {
        ...(currentPassword ? { currentPassword } : {}),
      });
    },
    onSuccess: (res: any) => {
      const data = res?.data || res || {};
      setOtpRequestedInfo({ maskedEmail: data.maskedEmail, devOtp: data.devOtp });
      toast.success(data.message || "Confirmation OTP sent to your email.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send confirmation OTP.");
    },
  });

  // Submit Change Password with Email OTP
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/change-password", {
        currentPassword,
        otp: passwordOtp.trim(),
        newPassword,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Password changed successfully.");
      setCurrentPassword("");
      setPasswordOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpRequestedInfo(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update password.");
    },
  });

  // 2FA Email Setup Initiate
  const initiateEmail2faMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/setup-initiate", {});
    },
    onSuccess: (res: any) => {
      const data = res?.data || res || {};
      setEmail2faInitiated({ maskedEmail: data.maskedEmail, devOtp: data.devOtp });
      toast.success(data.message || "2FA verification code sent to your email.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to initiate Email 2FA.");
    },
  });

  // 2FA Email Setup Confirm
  const confirmEmail2faMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/setup-confirm", { code: email2faCode.trim() });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Two-Factor Authentication enabled.");
      setEmail2faInitiated(null);
      setEmail2faCode("");
      queryClient.invalidateQueries({ queryKey: ["auth-2fa-status"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Invalid verification code.");
    },
  });

  // 2FA TOTP Initiate
  const initiateTotpMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/totp/initiate", {});
    },
    onSuccess: (res: any) => {
      const data = res?.data || res || {};
      setTotpSetup({ qrCode: data.qrCode || data.qrCodeUrl, secret: data.secret || data.manualEntryKey });
      toast.success("Scan the QR code in Google Authenticator or Authy, then enter the 6-digit code.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to initialize Authenticator App 2FA.");
    },
  });

  // 2FA TOTP Confirm
  const confirmTotpMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/totp/confirm", { token: totpVerifyCode.trim() });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Authenticator App 2FA enabled.");
      setTotpSetup(null);
      setTotpVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["auth-2fa-status"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Invalid 6-digit authenticator code.");
    },
  });

  // 2FA Disable (Self)
  const disable2faMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/auth/2fa/disable", {
        ...(disable2faPassword ? { currentPassword: disable2faPassword } : {}),
        ...(disable2faCode ? { currentTotp: disable2faCode.trim() } : {}),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Two-Factor Authentication disabled.");
      setDisable2faPassword("");
      setDisable2faCode("");
      queryClient.invalidateQueries({ queryKey: ["auth-2fa-status"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable 2FA.");
    },
  });

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Please select a PNG, JPG, WEBP, or GIF image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be 3 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        uploadAvatarMutation.mutate(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInstantSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (emp) {
      updateProfileMutation.mutate({ phone, gender });
    } else if (fullNameInput.trim()) {
      updateAccountProfileMutation.mutate({ fullName: fullNameInput.trim() });
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (passwordOtp.trim().length !== 6) {
      toast.error("Please request and enter the 6-digit email confirmation OTP.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    changePasswordMutation.mutate();
  };

  const openChangeRequest = (category: string, fieldKey: string) => {
    setRequestCategory(category);
    setRequestFieldKey(fieldKey);
    setRequestNewValue("");
    setRequestDialogOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestNewValue.trim()) {
      toast.error("Please enter a new value.");
      return;
    }
    submitChangeRequestMutation.mutate({
      fieldCategory: requestCategory,
      fieldKey: requestFieldKey,
      newValue: requestNewValue.trim(),
    });
  };

  if (authLoading && empLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <i className="ph ph-spinner-gap animate-spin text-3xl text-primary" />
      </div>
    );
  }

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <BreadcrumbNav className="mb-2" />

      {/* Top Profile Banner with Avatar Add / Edit / Delete */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative group shrink-0">
                <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl uppercase overflow-hidden shadow-xs">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="size-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {displayName}
                  </h1>
                  <Badge variant="soft" className="text-[11px] uppercase">
                    {emp?.status || userRoles[0]?.replace("_", " ") || "Active"}
                  </Badge>
                  <Badge
                    variant={is2faEnabled ? "success" : "warning"}
                    className="text-[11px] gap-1"
                  >
                    <i className={is2faEnabled ? "ph ph-shield-check" : "ph ph-shield-warning"} />
                    {is2faEnabled ? "2FA Enabled" : "2FA Disabled"}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>{displayEmail}</span>
                  {emp?.employeeCode && (
                    <>
                      <span>|</span>
                      <span className="font-semibold text-foreground">{emp.employeeCode}</span>
                    </>
                  )}
                  {emp?.department?.name && (
                    <>
                      <span>|</span>
                      <span>{emp.department.name}</span>
                    </>
                  )}
                </p>

                {/* Avatar CRUD Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={uploadAvatarMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 text-xs"
                  >
                    <i className={uploadAvatarMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-camera"} />
                    {avatarUrl ? "Change Photo" : "Add Photo"}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={deleteAvatarMutation.isPending}
                      onClick={() => deleteAvatarMutation.mutate()}
                      className="gap-1.5 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      <i className={deleteAvatarMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-trash"} />
                      Delete Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {emp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealSensitive((v) => !v)}
                className="flex items-center gap-2 text-xs shrink-0"
              >
                <i className={revealSensitive ? "ph ph-eye-slash" : "ph ph-eye"} />
                {revealSensitive ? "Hide Masked Values" : "Reveal Masked Values"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Change Requests Banner (Employee only) */}
      {emp?.pendingChangeRequests?.length > 0 && (
        <Alert variant="warning" className="text-xs">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-clock text-base shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                Pending HR Verification ({emp.pendingChangeRequests.length}):
              </span>{" "}
              You have pending requests to update sensitive records (
              {emp.pendingChangeRequests.map((r: any) => r.fieldKey).join(", ")}).
            </div>
          </div>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="rounded-lg text-xs font-semibold gap-1.5">
            <i className="ph ph-user" />
            General & Contact
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg text-xs font-semibold gap-1.5">
            <i className="ph ph-shield-check" />
            Security, Password & 2FA
          </TabsTrigger>
          {emp && (
            <>
              <TabsTrigger value="statutory" className="rounded-lg text-xs font-semibold gap-1.5">
                <i className="ph ph-credit-card" />
                Bank & Statutory
              </TabsTrigger>
              <TabsTrigger value="employment" className="rounded-lg text-xs font-semibold gap-1.5">
                <i className="ph ph-briefcase" />
                Employment & Org
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5">
                <i className="ph ph-clock-counter-clockwise" />
                Request History
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* TAB 1: General & Contact */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">Account & Contact Information</CardTitle>
                <CardDescription className="text-xs">
                  Manage your display profile and personal communication channels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInstantSave} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Work Email (Username)</Label>
                    <Input
                      id="email"
                      value={displayEmail}
                      disabled
                      className="bg-muted/40 text-xs"
                    />
                  </div>

                  {!emp && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-medium">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="Your full name"
                        className="text-xs"
                      />
                    </div>
                  )}

                  {emp && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-medium">Mobile Number</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="gender" className="text-xs font-medium">Gender</Label>
                        <Input
                          id="gender"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          placeholder="e.g. Female / Male / Other"
                          className="text-xs"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateProfileMutation.isPending || updateAccountProfileMutation.isPending}
                    className="w-full text-xs font-semibold mt-2 gap-1.5"
                  >
                    {(updateProfileMutation.isPending || updateAccountProfileMutation.isPending) && (
                      <i className="ph ph-spinner-gap animate-spin" />
                    )}
                    Save Profile Details
                  </Button>
                </form>
              </CardContent>
            </Card>

            {emp ? (
              <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Identity & Legal Details</CardTitle>
                  <CardDescription className="text-xs">
                    Legal fields require verification against statutory identity proofs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div>
                      <div className="text-muted-foreground">Legal Full Name</div>
                      <div className="font-semibold text-foreground mt-0.5">{emp.fullName}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openChangeRequest("personal", "legalName")}
                    >
                      Request Change
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div>
                      <div className="text-muted-foreground">Date of Birth</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : "Not provided"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openChangeRequest("personal", "dateOfBirth")}
                    >
                      Request Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Workspace Access & Roles</CardTitle>
                  <CardDescription className="text-xs">
                    Active organization and security status for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Organization</span>
                    <span className="font-semibold">{authUser?.profile?.tenant?.name || "Default Organization"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Assigned Roles</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(userRoles.length > 0 ? userRoles : ["member"]).map((r) => (
                        <Badge key={r} variant="soft" className="text-[11px] uppercase">
                          {r.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Two-Factor Authentication</span>
                    <Badge variant={is2faEnabled ? "success" : "warning"} className="text-[11px]">
                      {is2faEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Security, Change Password (Email OTP) & 2FA (ALL USERS) */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password with Email OTP Confirmation */}
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <i className="ph ph-key text-base" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <CardDescription className="text-xs">
                      Email OTP confirmation is required before updating your password.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword" className="text-xs font-medium">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="text-xs"
                    />
                  </div>

                  {/* Step 1: Trigger Confirmation OTP Mail */}
                  <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Step 1: Email Confirmation OTP</p>
                        <p className="text-[11px] text-muted-foreground">
                          Send a 6-digit verification code to {displayEmail}.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={requestPasswordOtpMutation.isPending}
                        onClick={() => requestPasswordOtpMutation.mutate()}
                        className="gap-1.5 shrink-0"
                      >
                        <i className={requestPasswordOtpMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-envelope-simple"} />
                        {otpRequestedInfo ? "Resend OTP" : "Send Confirmation OTP"}
                      </Button>
                    </div>

                    {otpRequestedInfo && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                        OTP dispatched to <span className="font-semibold">{otpRequestedInfo.maskedEmail || displayEmail}</span>.
                        {otpRequestedInfo.devOtp && (
                          <span className="block mt-1 font-semibold">
                            Local Dev Preview OTP: {otpRequestedInfo.devOtp}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="passwordOtp" className="text-xs font-medium">6-Digit Confirmation OTP</Label>
                    <Input
                      id="passwordOtp"
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP from email"
                      maxLength={6}
                      className="text-xs tracking-widest"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-xs font-medium">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={changePasswordMutation.isPending}
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <i className={changePasswordMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-lock-key"} />
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication (2FA) Enable / Disable */}
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <i className="ph ph-shield-check text-base" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Two-Factor Authentication (2FA)</CardTitle>
                      <CardDescription className="text-xs">
                        Protect your login with Email OTP or an Authenticator App.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={is2faEnabled ? "success" : "warning"} className="text-[11px]">
                    {is2faEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {!is2faEnabled ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={twoFaMethod === "email" ? "default" : "outline"}
                        onClick={() => setTwoFaMethod("email")}
                        className="text-xs gap-1.5"
                      >
                        <i className="ph ph-envelope-simple" />
                        Email OTP
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={twoFaMethod === "totp" ? "default" : "outline"}
                        onClick={() => setTwoFaMethod("totp")}
                        className="text-xs gap-1.5"
                      >
                        <i className="ph ph-qr-code" />
                        Authenticator App
                      </Button>
                    </div>

                    {twoFaMethod === "email" ? (
                      <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          Receive a 6-digit verification code at <span className="font-semibold text-foreground">{displayEmail}</span> whenever you sign in.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={initiateEmail2faMutation.isPending}
                          onClick={() => initiateEmail2faMutation.mutate()}
                          className="w-full text-xs gap-1.5"
                        >
                          <i className={initiateEmail2faMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-paper-plane-tilt"} />
                          {email2faInitiated ? "Resend Setup Code" : "Send 2FA Setup Code"}
                        </Button>

                        {email2faInitiated && (
                          <div className="space-y-2.5 pt-2 border-t border-border/50">
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                              Code sent to {email2faInitiated.maskedEmail || displayEmail}.
                              {email2faInitiated.devOtp && (
                                <span className="block font-semibold mt-0.5">
                                  Local Dev Preview Code: {email2faInitiated.devOtp}
                                </span>
                              )}
                            </p>
                            <Input
                              value={email2faCode}
                              onChange={(e) => setEmail2faCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit email code"
                              maxLength={6}
                              className="text-xs tracking-widest"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={confirmEmail2faMutation.isPending || email2faCode.length !== 6}
                              onClick={() => confirmEmail2faMutation.mutate()}
                              className="w-full text-xs font-semibold gap-1.5"
                            >
                              <i className={confirmEmail2faMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-check-circle"} />
                              Verify & Enable 2FA
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          Use Google Authenticator, Microsoft Authenticator, or Authy to generate time-based 6-digit codes.
                        </p>
                        {!totpSetup ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={initiateTotpMutation.isPending}
                            onClick={() => initiateTotpMutation.mutate()}
                            className="w-full text-xs gap-1.5"
                          >
                            <i className={initiateTotpMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-qr-code"} />
                            Generate Authenticator QR Code
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            {totpSetup.qrCode && (
                              <div className="flex justify-center p-3 bg-white rounded-lg border border-border/50">
                                <img src={totpSetup.qrCode} alt="2FA QR Code" className="size-40" />
                              </div>
                            )}
                            {totpSetup.secret && (
                              <div className="text-[11px] text-center text-muted-foreground">
                                Manual Key: <span className="font-semibold text-foreground select-all">{totpSetup.secret}</span>
                              </div>
                            )}
                            <Input
                              value={totpVerifyCode}
                              onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit authenticator code"
                              maxLength={6}
                              className="text-xs tracking-widest"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={confirmTotpMutation.isPending || totpVerifyCode.length !== 6}
                              onClick={() => confirmTotpMutation.mutate()}
                              className="w-full text-xs font-semibold gap-1.5"
                            >
                              <i className={confirmTotpMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-check-circle"} />
                              Confirm & Enable Authenticator 2FA
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5">
                      <i className="ph ph-check-circle text-base shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Two-Factor Authentication is Active</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Your account is protected. You can disable 2FA below using your current password or 6-digit authenticator code. Tenant Administrators can also reset your 2FA if you lose access.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-muted/20">
                      <p className="text-xs font-semibold text-foreground">Disable Two-Factor Authentication</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="disable2faPassword" className="text-xs font-medium">Current Password</Label>
                        <Input
                          id="disable2faPassword"
                          type="password"
                          value={disable2faPassword}
                          onChange={(e) => setDisable2faPassword(e.target.value)}
                          placeholder="Enter current password to confirm"
                          className="text-xs"
                        />
                      </div>
                      <div className="text-center text-[11px] text-muted-foreground">or</div>
                      <div className="space-y-1.5">
                        <Label htmlFor="disable2faCode" className="text-xs font-medium">6-Digit Authenticator Code</Label>
                        <Input
                          id="disable2faCode"
                          value={disable2faCode}
                          onChange={(e) => setDisable2faCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Enter 6-digit TOTP code"
                          maxLength={6}
                          className="text-xs tracking-widest"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={disable2faMutation.isPending || (!disable2faPassword && disable2faCode.length !== 6)}
                        onClick={() => disable2faMutation.mutate()}
                        className="w-full text-xs font-semibold gap-1.5"
                      >
                        <i className={disable2faMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-shield-slash"} />
                        Disable 2FA
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Bank & Statutory (Employees) */}
        {emp && (
          <TabsContent value="statutory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Bank Account for Payroll</CardTitle>
                    <CardDescription className="text-xs">Direct deposit account for monthly salary disbursements.</CardDescription>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openChangeRequest("bank", "bankAccount")}
                  >
                    Update Account
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span className="font-semibold">{emp.statutory?.bankName || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Account Number</span>
                    <span className="font-semibold">
                      {revealSensitive ? emp.statutory?.bankAccountMasked || "None" : emp.statutory?.bankAccountMasked || "********"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">IFSC Code</span>
                    <span className="font-semibold">{emp.statutory?.bankIfsc || "None"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="font-semibold">{emp.statutory?.bankBranch || "None"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Statutory Identifiers</CardTitle>
                    <CardDescription className="text-xs">PF, ESI, PAN and government tax registrations.</CardDescription>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openChangeRequest("statutory", "pan")}
                  >
                    Update PAN / UAN
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Permanent Account Number (PAN)</span>
                    <span className="font-semibold">
                      {revealSensitive ? emp.statutory?.panMasked || "None" : emp.statutory?.panMasked || "********"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Aadhaar (UIDAI)</span>
                    <span className="font-semibold">
                      {revealSensitive ? emp.statutory?.aadhaarMasked || "None" : emp.statutory?.aadhaarMasked || "********"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Universal Account Number (UAN)</span>
                    <span className="font-semibold">{emp.statutory?.uanMasked || "None"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Tax Regime</span>
                    <Badge variant="soft" className="uppercase text-[10px]">
                      {emp.taxRegime} Regime
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* TAB 4: Employment & Org (Employees) */}
        {emp && (
          <TabsContent value="employment" className="space-y-6">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">Organization & Reporting Line</CardTitle>
                <CardDescription className="text-xs">Your official position and branch allocation inside the company.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-buildings" /> Department
                    </div>
                    <div className="font-bold text-sm mt-1">{emp.department?.name || "General"}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-briefcase" /> Designation
                    </div>
                    <div className="font-bold text-sm mt-1">{emp.designation?.name || emp.position || "Employee"}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-map-pin" /> Work Location / Branch
                    </div>
                    <div className="font-bold text-sm mt-1">{emp.branch?.name || "Main Headquarters"}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-calendar" /> Joining Date
                    </div>
                    <div className="font-bold text-sm mt-1">
                      {emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : "Not specified"}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-identification-badge" /> Employment Type
                    </div>
                    <div className="font-bold text-sm mt-1 capitalize">{emp.employmentType?.replace("_", " ")}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="ph ph-user-circle" /> Reporting Manager
                    </div>
                    <div className="font-bold text-sm mt-1">
                      {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : "Direct to HR / Leadership"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* TAB 5: Request History (Employees) */}
        {emp && (
          <TabsContent value="history" className="space-y-6">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">Self-Service Change Request Log</CardTitle>
                <CardDescription className="text-xs">
                  Audit trail of sensitive modifications requested for HR review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emp.pendingChangeRequests?.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No active or past change requests recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {emp.pendingChangeRequests.map((req: any) => (
                      <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span className="capitalize">{req.fieldCategory}</span>: {req.fieldKey}
                            <Badge
                              variant={
                                req.status === "APPROVED"
                                  ? "success"
                                  : req.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                              }
                              className="text-[10px]"
                            >
                              {req.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[11px]">
                            Requested: {new Date(req.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">New Value</div>
                          <div className="font-semibold">{req.newValueJson}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Sensitive Field Change Request Modal */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Profile Record Modification</DialogTitle>
            <DialogDescription className="text-xs">
              Modifying sensitive records ({requestFieldKey}) requires verification by your HR department.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Input value={requestCategory} disabled className="bg-muted text-xs capitalize" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Field to Update</Label>
              <Input value={requestFieldKey} disabled className="bg-muted text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newValue" className="text-xs font-medium">Proposed New Value</Label>
              <Input
                id="newValue"
                value={requestNewValue}
                onChange={(e) => setRequestNewValue(e.target.value)}
                placeholder="Enter new account / ID / legal detail"
                className="text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRequestDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitChangeRequestMutation.isPending}
                className="text-xs font-semibold gap-1.5"
              >
                {submitChangeRequestMutation.isPending && (
                  <i className="ph ph-spinner-gap animate-spin" />
                )}
                Submit to HR
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
