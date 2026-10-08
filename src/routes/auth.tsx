import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useAppConfig } from "@/lib/useAppConfig";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { resolveDefaultRoute, extractRolesFromToken } from "@/lib/auth-navigation";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot", "reset", "verify"]).optional(),
  redirect: z.string().optional(),
  token: z.string().optional(),
  error: z.string().optional(),
  provider: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In — Workspace ERP & HRMS" },
      { name: "description", content: "Sign in to your enterprise ERP & HRMS workspace." },
    ],
  }),
});

function AuthPage() {
  const { mode: initialMode, redirect, token: searchToken, error: searchError, provider: searchProvider, email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { appConfig } = useAppConfig();
  const { branding } = useTenantBranding();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset" | "verify">(
    searchToken ? "reset" : (initialMode ?? "signin")
  );
  const [email, setEmail] = useState(searchEmail || "");
  const [resetToken, setResetToken] = useState(searchToken || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync token from URL query params (e.g., when arriving via email reset link)
  useEffect(() => {
    if (searchToken) {
      setResetToken(searchToken);
      setMode("reset");
    }
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchToken, searchEmail]);

  // OTP Verification state (Forgot password / Verify email)
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  // 2FA / TOTP Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown, canResend]);

  // Query OAuth config from backend
  const { data: oauthConfig } = useQuery({
    queryKey: ["oauth-config"],
    queryFn: async () => {
      try {
        return await api.get("/auth/oauth/config");
      } catch {
        return null;
      }
    },
  });

  // Query Tenant Login Credentials from DB for the active workspace host
  const { data: tenantCredsData } = useQuery({
    queryKey: ["tenant-public-credentials", branding?.slug],
    queryFn: async () => {
      try {
        const slugParam = branding?.slug ? `?slug=${encodeURIComponent(branding.slug)}` : "";
        return await api.get(`/auth/public/tenant/credentials${slugParam}`);
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const tenantAdminCreds = tenantCredsData?.credentials?.tenantAdmin || {
    email: "gowthamtooquik@gmail.com",
    name: "Gowtham (Tenant Administrator)",
    role: "Tenant Admin",
  };
  const hrAdminCreds = tenantCredsData?.credentials?.hrAdmin || {
    email: "hr@masterhrms.com",
    name: "Sarah Jenkins (HR Director)",
    role: "HR Admin",
  };
  const employeeCreds = tenantCredsData?.credentials?.employee || {
    email: "employee@masterhrms.com",
    name: "Alex Morgan (Staff)",
    role: "Employee",
  };

  const logoLightUrl = appConfig.logoLightUrl || branding.logoUrl || "/logo.webp";
  const logoDarkUrl = appConfig.logoDarkUrl || branding.logoDark || "/white-logo.webp";
  const appName = appConfig.appName || branding.name || "Master Workspace ERP";
  const footerText = appConfig.footerText || branding.footerText || "© 2026 Master HRMS. All rights reserved.";

  const googleVisible = Boolean(oauthConfig?.google?.enabled);
  const appleVisible = Boolean(oauthConfig?.apple?.enabled);
  const linkedinVisible = Boolean(oauthConfig?.linkedin?.enabled);
  const facebookVisible = Boolean(oauthConfig?.facebook?.enabled);

  const secondaryProviders = [
    appleVisible && {
      id: "apple" as const,
      name: "Apple",
      icon: (
        <svg className="size-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.92.04-2.02.62-2.67 1.37-.58.67-1.1 1.74-.96 2.77 1.02.08 2.08-.53 2.71-1.29z" />
        </svg>
      ),
    },
    linkedinVisible && {
      id: "linkedin" as const,
      name: "LinkedIn",
      icon: (
        <svg className="size-4 fill-[#0A66C2] shrink-0" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
    },
    facebookVisible && {
      id: "facebook" as const,
      name: "Facebook",
      icon: (
        <svg className="size-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ].filter(Boolean) as { id: "apple" | "linkedin" | "facebook"; name: string; icon: any }[];

  const anySocialVisible = googleVisible || secondaryProviders.length > 0;

  useEffect(() => {
    // If it's a password reset flow, searchToken is the one-time reset token, NOT an OAuth login token!
    if (initialMode === "reset" || mode === "reset") {
      return;
    }

    if (searchToken) {
      setToken(searchToken);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      toast.success(`Successfully signed in with ${searchProvider ? searchProvider.toUpperCase() : "OAuth"}!`);
      const { roles, isImpersonating } = extractRolesFromToken(searchToken);
      navigate({ to: resolveDefaultRoute(roles, redirect, { isImpersonating }) });
      return;
    }

    if (searchError) {
      toast.error(decodeURIComponent(searchError));
    }

    const token = localStorage.getItem("hrms_auth_token");
    if (token && mode === "signin") {
      const { roles, isImpersonating } = extractRolesFromToken(token);
      navigate({ to: resolveDefaultRoute(roles, redirect, { isImpersonating }) });
    }
  }, [searchToken, searchError, searchProvider, navigate, redirect, qc, mode, initialMode]);

  // Sign in / Sign up submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) return toast.error("Please enter your work email address");
    if (!cleanPassword) return toast.error("Please enter your account password");

    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          setLoading(false);
          return;
        }

        const res = await api.post("/auth/register", {
          email: cleanEmail,
          password: cleanPassword,
          fullName: fullName.trim() || cleanEmail.split("@")[0],
          companyName: companyName.trim() || undefined,
        });

        if (res.token) {
          setToken(res.token);
          qc.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Account created successfully! Let's set up your workspace.");
          navigate({ to: "/onboarding" });
        } else {
          toast.success("Account initiated! Please verify your email.");
          setMode("verify");
        }
      } else {
        const res = await api.post("/auth/login", {
          email: cleanEmail,
          password: cleanPassword,
        });

        if (res.requires2FA) {
          sessionStorage.setItem("mfa_temp_token", res.mfaToken);
          sessionStorage.setItem("mfa_masked_email", res.maskedEmail || res.email);
          sessionStorage.setItem("mfa_is_setup", res.isSetup ? "true" : "false");
          if (res.devOtp) {
            sessionStorage.setItem("mfa_dev_otp", res.devOtp);
          } else {
            sessionStorage.removeItem("mfa_dev_otp");
          }
          if (res.emailError) {
            sessionStorage.setItem("mfa_email_error", res.emailError);
          } else {
            sessionStorage.removeItem("mfa_email_error");
          }
          toast.info(res.message || "A 6-digit verification code has been sent to your email.");
          navigate({ to: "/verify-2fa", search: { redirect: redirect || undefined } });
          return;
        }

        if (res.token) {
          setToken(res.token);
          qc.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Signed in successfully!");

          const verifiedRoles = res.roles || res.user?.roles || extractRolesFromToken(res.token).roles;
          const isSuperAdmin = verifiedRoles.includes("super_admin");
          const isImpersonating = res.isImpersonating || extractRolesFromToken(res.token).isImpersonating;

          // If logging in on root domain, redirect to tenant workspace (ONLY for non-super-admins)
          if (!isSuperAdmin && res.workspaceUrl && typeof window !== "undefined") {
            try {
              const currentOrigin = window.location.origin.toLowerCase();
              const targetOrigin = new URL(res.workspaceUrl).origin.toLowerCase();
              if (currentOrigin !== targetOrigin) {
                window.location.href = `${res.workspaceUrl}/auth?token=${res.token}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
                return;
              }
            } catch {}
          }

          navigate({ to: resolveDefaultRoute(verifiedRoles, redirect, { isImpersonating }) });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Forgot password submit
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your account email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMaskedEmail(res.maskedEmail || email);
      toast.success(res.message || "Password reset instructions dispatched to your email.");
      setMode("reset");
    } catch (err: any) {
      toast.error(err.message || "Unable to send password reset code.");
    } finally {
      setLoading(false);
    }
  }

  // Reset password submit
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Please enter your work email.");
    if (!resetToken && (!otpCode || otpCode.length < 6)) {
      return toast.error("Please enter the 6-digit verification code or click a valid reset link.");
    }
    if (password.length < 8) return toast.error("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return toast.error("Passwords do not match.");

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        token: resetToken || undefined,
        code: !resetToken ? otpCode : undefined,
        newPassword: password,
      });

      toast.success(res.message || "Password updated! You can now sign in.");
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setResetToken("");
      navigate({ to: "/auth", search: { mode: "signin", email } });
      setMode("signin");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password. Please check your reset link or code.");
    } finally {
      setLoading(false);
    }
  }

  // Verify email submit
  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email.");
    if (!otpCode || otpCode.length < 6) return toast.error("Please enter the 6-digit verification code.");

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email", { email, code: otpCode });
      toast.success(res.message || "Email verified! You can now sign in.");
      setMode("signin");
    } catch (err: any) {
      toast.error(err.message || "Verification code failed.");
    } finally {
      setLoading(false);
    }
  }

  // Resend email code
  async function handleResendVerification() {
    if (!email) return toast.error("Please specify your email.");
    setLoading(true);
    try {
      const res = await api.post("/auth/resend-verification", { email });
      toast.success(res.message || "A new 6-digit code has been sent.");
      setResendCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      return toast.error(
        isBackupMode
          ? "Please enter your emergency backup code"
          : "Please enter your 6-digit authenticator code"
      );
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/verify-login", {
        mfaToken,
        code: cleanCode,
      });

      if (res.token) {
        setToken(res.token);
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success("Identity verified! Signed in successfully.");

        const verifiedRoles = res.roles || res.user?.roles || extractRolesFromToken(res.token).roles;
        const isSuperAdmin = verifiedRoles.includes("super_admin");
        const isImpersonating = res.isImpersonating || extractRolesFromToken(res.token).isImpersonating;

        // If logging in on root domain, redirect to tenant workspace (ONLY for non-super-admins)
        if (!isSuperAdmin && res.workspaceUrl && typeof window !== "undefined") {
          try {
            const currentOrigin = window.location.origin.toLowerCase();
            const targetOrigin = new URL(res.workspaceUrl).origin.toLowerCase();
            if (currentOrigin !== targetOrigin) {
              window.location.href = `${res.workspaceUrl}/auth?token=${res.token}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
              return;
            }
          } catch {}
        }

        navigate({ to: resolveDefaultRoute(verifiedRoles, redirect, { isImpersonating }) });
      }
    } catch (err: any) {
      toast.error(err.message || "Verification code failed. Please check your Authenticator app.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-light dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
      {/* Start Signin / Auth Card matching ui/login.html */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md shadow-sm w-full max-w-md sm:p-8 p-5 relative">
        {/* Floating Theme Switcher */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Brand Logo Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img
              src={logoLightUrl}
              alt={appName}
              className="h-10 max-h-10 w-auto object-contain mx-auto dark:hidden"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.webp";
              }}
              loading="lazy"
            />
            <img
              src={logoDarkUrl || logoLightUrl}
              alt={appName}
              className="h-10 max-h-10 w-auto object-contain mx-auto hidden dark:block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/white-logo.webp";
              }}
              loading="lazy"
            />
          </Link>
          <h1 className="text-xl font-bold text-title mb-1">
            {isMfaStep
              ? "Two-Factor Authentication"
              : mode === "forgot"
              ? "Forgot Password"
              : mode === "reset"
              ? "Reset Password"
              : mode === "verify"
              ? "Verify Email"
              : mode === "signup"
              ? "Create Account"
              : "Welcome Back!"}
          </h1>
          <p className="text-sm text-default mb-0">
            {isMfaStep
              ? "Enter your 6-digit authenticator or recovery code"
              : mode === "forgot"
              ? "Enter your account email to receive reset code"
              : mode === "reset"
              ? "Enter the code and set your new password"
              : mode === "verify"
              ? "Enter the 6-digit confirmation code"
              : mode === "signup"
              ? "Sign up for your workspace account"
              : "Sign in to your account"}
          </p>
        </div>

        {/* 2FA MFA Step */}
        {isMfaStep ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setIsMfaStep(false);
                setMfaCode("");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to sign in</span>
            </button>

            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
                  {isBackupMode ? "8-Character Recovery Code" : "6-Digit Security Code"}
                </label>
                <input
                  type="text"
                  maxLength={isBackupMode ? 10 : 6}
                  autoFocus
                  placeholder={isBackupMode ? "ABCD1234" : "000000"}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-base border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify & Sign In
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupMode(!isBackupMode);
                    setMfaCode("");
                  }}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  {isBackupMode ? "Use Authenticator App Code" : "Lost device? Use emergency recovery code"}
                </button>
              </div>
            </form>
          </div>
        ) : mode === "forgot" ? (
          /* FORGOT PASSWORD MODE */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to sign in</span>
            </button>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Email Address</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Send Reset Instructions
              </button>
            </form>
          </div>
        ) : mode === "reset" ? (
          /* RESET PASSWORD MODE */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setResetToken("");
                setMode("signin");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to sign in</span>
            </button>

            {resetToken ? (
              <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">One-Time Reset Link Verified</p>
                  <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Your secure reset link is authenticated. Choose a new password below.
                  </p>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={Boolean(resetToken)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0 disabled:opacity-75"
                  required
                />
              </div>

              {!resetToken && (
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">6-Digit Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-base border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">New Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                  autoFocus={Boolean(resetToken)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {resetToken ? "Update Password & Sign In" : "Save Password & Sign In"}
              </button>
            </form>
          </div>
        ) : mode === "verify" ? (
          /* VERIFY EMAIL MODE */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to sign in</span>
            </button>

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">6-Digit Code</label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {canResend ? "Code expired" : `Resend in ${resendCountdown}s`}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-base border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResendVerification}
                  className="text-xs text-primary font-semibold hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="size-3" /> Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Confirm Email Address
              </button>
            </form>
          </div>
        ) : (
          /* Main Sign In / Sign Up Form matching ui/login.html */
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Workspace Credentials Switcher (Fetched dynamically from DB) */}
            {mode === "signin" && (
              <div className="rounded-md border border-border-color bg-light dark:bg-slate-800/50 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-title flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="size-3.5 text-primary" /> Workspace Credentials
                  </span>
                  <span className="text-[10px] text-default font-mono">Password: admin123</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(tenantAdminCreds.email);
                      setPassword("admin123");
                    }}
                    className="px-2 py-1.5 rounded border border-border-color bg-white dark:bg-slate-800 hover:border-primary text-left cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-title truncate">{tenantAdminCreds.role || "Tenant Admin"}</div>
                    <div className="text-[10px] text-default truncate" title={tenantAdminCreds.name}>
                      {tenantAdminCreds.name?.split(" ")[0] || "Admin"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(hrAdminCreds.email);
                      setPassword("admin123");
                    }}
                    className="px-2 py-1.5 rounded border border-border-color bg-white dark:bg-slate-800 hover:border-primary text-left cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-title truncate">{hrAdminCreds.role || "HR Admin"}</div>
                    <div className="text-[10px] text-default truncate" title={hrAdminCreds.name}>
                      {hrAdminCreds.name?.split(" ")[0] || "HR"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(employeeCreds.email);
                      setPassword("admin123");
                    }}
                    className="px-2 py-1.5 rounded border border-border-color bg-white dark:bg-slate-800 hover:border-primary text-left cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-title truncate">{employeeCreds.role || "Employee"}</div>
                    <div className="text-[10px] text-default truncate" title={employeeCreds.name}>
                      {employeeCreds.name?.split(" ")[0] || "Staff"}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <>
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Company / Organization</label>
                  <input
                    type="text"
                    placeholder="Acme Global Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                required
                autoFocus={mode === "signin"}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-primary hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pe-10 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <i className={cn("text-base ph-duotone", showPassword ? "ph-eye-slash" : "ph-eye")}></i>
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Confirm Password</label>
                <input
                  type="password"
                  placeholder="************"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                  required
                />
              </div>
            )}

            {mode === "signin" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-border-color cursor-pointer text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember" className="text-sm text-default cursor-pointer">Remember me</label>
                </div>
                <button
                  type="button"
                  onClick={() => setMode("verify")}
                  className="text-xs text-default hover:text-primary cursor-pointer"
                >
                  Verify Email Code
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </button>

            {mode === "signin" && anySocialVisible && (
              <>
                <div className="text-center text-sm text-default">Or sign in with</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `${API_BASE}/auth/oauth/google`;
                    }}
                    className="border border-border-color rounded-md py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <i className="ph-fill ph-google-logo text-base"></i> Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `${API_BASE}/auth/oauth/apple`;
                    }}
                    className="border border-border-color rounded-md py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <i className="ph-fill ph-apple-logo text-base"></i> Apple
                  </button>
                </div>
              </>
            )}

            <p className="text-center text-sm text-default mb-0 pt-2">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border-color pt-4 mt-6">
          <Link to="/help-center" className="hover:text-foreground">
            Help Center
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing Plans
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact Support
          </Link>
        </div>

        {/* Dynamic Footer Text */}
        <div className="text-center text-xs text-muted-foreground pt-3" data-testid="auth-footer-text">
          {footerText}
        </div>
      </div>
    </div>
  );
}
