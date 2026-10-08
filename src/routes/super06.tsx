import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken, clearToken } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Mail,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";
import { useAppConfig, applyThemeVariables } from "@/lib/useAppConfig";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { NotFoundView } from "@/components/error-pages/not-found-view";

const super06SearchSchema = z.object({
  mode: z.enum(["signin", "forgot", "reset"]).optional(),
  token: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/super06")({
  validateSearch: super06SearchSchema,
  beforeLoad: () => {
    // Super-admin routes are strictly prohibited on tenant subdomains
    if (typeof window !== "undefined" && isTenantWorkspaceHost()) {
      throw notFound();
    }
  },
  component: Super06LoginPage,
  notFoundComponent: () => <NotFoundView />,
  head: () => ({
    meta: [
      { title: "Sign In — Master HRMS" },
      {
        name: "description",
        content: "Dedicated root administrator authentication portal for Super Admin access.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

export function Super06LoginPage() {
  if (typeof window !== "undefined" && isTenantWorkspaceHost()) {
    return <NotFoundView />;
  }

  const { mode: searchMode, token: searchToken, email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { appConfig } = useAppConfig();
  const { branding } = useTenantBranding();

  const [mode, setMode] = useState<"signin" | "forgot" | "reset">(
    searchToken ? "reset" : (searchMode ?? "signin")
  );
  const [resetToken, setResetToken] = useState(searchToken || "");
  const [email, setEmail] = useState(searchEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Sync token from URL query params
  useEffect(() => {
    if (searchToken) {
      setResetToken(searchToken);
      setMode("reset");
    }
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchToken, searchEmail]);

  // 2FA Verification Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);

  const logoLightUrl = appConfig.logoLightUrl || branding.logoUrl || "/logo.webp";
  const logoDarkUrl = appConfig.logoDarkUrl || branding.logoDark || "/white-logo.webp";
  const appName = appConfig.appName || branding.name || "Master HRMS";
  const footerText = appConfig.footerText || branding.footerText || "© 2026 Master HRMS. All rights reserved.";

  // Guarantee application default theme color (#2563EB)
  useEffect(() => {
    const activeColor = branding?.primaryColor || appConfig?.primaryColor || "#2563EB";
    applyThemeVariables(activeColor);
  }, [branding?.primaryColor, appConfig?.primaryColor]);

  // Check if session is already authenticated as super_admin
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token");
      if (token) {
        try {
          const user = await api.get("/auth/me");
          if (user?.roles?.includes("super_admin")) {
            navigate({ to: "/super" });
            return;
          }
        } catch {
          // Token expired or invalid
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: cleanEmail,
        password,
        portal: "super", // Backend gate: strictly rejects non-super_admin accounts
      });

      // Handle 2FA Challenge
      if (res.requires2FA) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken);
        setMfaCode("");
        toast.info("Two-Factor Authentication code required.");
        setLoading(false);
        return;
      }

      // Explicit Role Gate: ONLY super_admin is permitted
      const roles: string[] = res.roles || res.user?.roles || [];
      const isSuper = roles.includes("super_admin");
      if (!isSuper) {
        clearToken();
        toast.error("Access Denied: Only Super Administrators can log in through this portal.");
        setLoading(false);
        return;
      }

      // Store tokens and clear cache
      setToken(res.token);
      localStorage.setItem("hrms_auth_token", res.token);
      localStorage.setItem("auth_token", res.token);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });

      toast.success("Signed in successfully!");

      // DIRECT NAVIGATION to /super on root domain
      navigate({ to: "/super" });
    } catch (err: any) {
      clearToken();
      const msg =
        err?.status === 403 || err?.code === "SUPER_ADMIN_ONLY"
          ? "Access Denied: Only Super Administrators can log in through this portal."
          : err?.message || "Invalid Super Administrator credentials.";
      toast.error(msg);
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      toast.error("Please enter your verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/verify-login", {
        mfaToken,
        code: cleanCode,
        portal: "super",
      });

      const roles: string[] = res.roles || res.user?.roles || [];
      const isSuper = roles.includes("super_admin");
      if (!isSuper) {
        clearToken();
        toast.error("Access Denied: Account lacks Super Administrator privileges.");
        setLoading(false);
        return;
      }

      setToken(res.token);
      localStorage.setItem("hrms_auth_token", res.token);
      localStorage.setItem("auth_token", res.token);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });

      toast.success("Signed in successfully!");
      navigate({ to: "/super" });
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code.");
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your account email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      toast.success(res.message || "Password reset instructions dispatched to your email.");
      setMode("reset");
    } catch (err: any) {
      toast.error(err.message || "Unable to send password reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Please enter your work email.");
    if (!resetToken && (!otpCode || otpCode.length < 6)) {
      return toast.error("Please enter the 6-digit verification code or click a valid reset link.");
    }
    if (!password || password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirmPassword) return toast.error("Passwords do not match.");

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        token: resetToken || undefined,
        code: !resetToken ? otpCode : undefined,
        newPassword: password,
      });
      toast.success(res.message || "Password updated successfully. Please sign in.");
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setResetToken("");
      navigate({ to: "/super06", search: { mode: "signin", email } });
      setMode("signin");
    } catch (err: any) {
      toast.error(err.message || "Password reset failed. Please check your reset link or code.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="bg-light dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
      {/* Start Signin / Auth Card matching default HRMS design / auth.tsx / ui/login.html */}
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
              : "Welcome Back!"}
          </h1>
          <p className="text-sm text-default mb-0">
            {isMfaStep
              ? "Enter your 6-digit authenticator or recovery code"
              : mode === "forgot"
              ? "Enter your account email to receive reset code"
              : mode === "reset"
              ? "Enter the code and set your new password"
              : "Sign in to your account"}
          </p>
        </div>

        {/* 2FA Challenge View */}
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
                  required
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
                  placeholder="admin@masterhrms.com"
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
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Email Address</label>
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
                  placeholder="At least 6 characters"
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
        ) : (
          /* Main Super Admin Sign In Form matching auth.tsx */
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Super Admin Credentials Box matching default UI */}
            <div className="rounded-md border border-border-color bg-light dark:bg-slate-800/50 p-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-title flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="size-3.5 text-primary" /> Super Admin Credentials
                </span>
                <span className="text-[10px] text-default font-mono">Password: admin123</span>
              </div>
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@masterhrms.com");
                    setPassword("admin123");
                  }}
                  className="w-full px-2.5 py-1.5 rounded border border-border-color bg-white dark:bg-slate-800 hover:border-primary text-left cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-[11px] font-bold text-title">Super Admin</div>
                    <div className="text-[10px] text-default">admin@masterhrms.com</div>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">Autofill</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@masterhrms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border-color rounded-md bg-white dark:bg-slate-800 text-title focus:outline-none focus:ring-0"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-super"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-border-color cursor-pointer text-primary focus:ring-primary"
                />
                <label htmlFor="remember-super" className="text-sm text-default cursor-pointer">
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dark text-white py-2.5 rounded-md text-sm font-semibold hover:bg-primary-hover cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign In
            </button>

            <p className="text-center text-sm text-default mb-0 pt-2">
              Looking for employee or workspace login?{" "}
              <Link to="/auth" className="text-primary hover:underline font-semibold cursor-pointer">
                Tenant Sign in
              </Link>
            </p>
          </form>
        )}

        {/* Footer Navigation matching auth.tsx */}
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

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {footerText}
        </div>
      </div>
    </div>
  );
}
