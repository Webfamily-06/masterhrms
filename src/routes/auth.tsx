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
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
  token: z.string().optional(),
  error: z.string().optional(),
  provider: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In — Master Workspace ERP" },
      { name: "description", content: "Sign in to your enterprise ERP & HRMS workspace." },
    ],
  }),
});

function AuthPage() {
  const { mode: initialMode, redirect, token: searchToken, error: searchError, provider: searchProvider } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2FA / TOTP Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);

  // Query platform settings for dynamic logos & app name
  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return (page?.content as any) || null;
      } catch {
        return null;
      }
    },
  });

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

  let cachedLogoLight = "";
  let cachedAppName = "";
  try {
    if (typeof window !== "undefined") {
      cachedLogoLight = localStorage.getItem("master_hrms_logo_light") || "";
      cachedAppName = localStorage.getItem("master_hrms_app_name") || "";
    }
  } catch (e) {}

  const logoLightUrl = platformSettings?.logoLightUrl || cachedLogoLight || "/logo.webp";
  const appName = platformSettings?.appName || cachedAppName || "Sneat ERP";

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
    if (searchToken) {
      setToken(searchToken);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      toast.success(`Successfully signed in with ${searchProvider ? searchProvider.toUpperCase() : "OAuth"}!`);
      navigate({ to: redirect || "/dashboard" });
      return;
    }

    if (searchError) {
      toast.error(decodeURIComponent(searchError));
    }

    const token = localStorage.getItem("hrms_auth_token");
    if (token) {
      navigate({ to: redirect || "/dashboard" });
    }
  }, [searchToken, searchError, searchProvider, navigate, redirect, qc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) return toast.error("Please enter your work email address");
    if (!cleanPassword) return toast.error("Please enter your account password");

    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await api.post("/auth/register", {
          email: cleanEmail,
          password: cleanPassword,
          fullName: fullName.trim() || cleanEmail.split("@")[0],
        });

        if (res.token) {
          setToken(res.token);
          qc.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Account registered successfully! Redirecting...");
          navigate({ to: redirect || "/dashboard" });
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
          toast.info(res.message || "A 6-digit verification code has been sent to your email.");
          navigate({ to: "/verify-2fa", search: { redirect: redirect || undefined } });
          return;
        }

        if (res.token) {
          setToken(res.token);
          qc.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Signed in successfully!");
          navigate({ to: redirect || "/dashboard" });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check your credentials.");
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
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Verification code failed. Please check your Authenticator app.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground selection:bg-primary/20">
      {/* ── Left Illustration (Sneat Pro Auth V2 Hero) ─────────────── */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 relative items-center justify-center p-12 bg-muted/20 border-r border-border/60 overflow-hidden">
        {/* Background Mask */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 -z-10" />

        <div className="max-w-xl text-center flex flex-col items-center">
          <img
            src="/images/pages/auth-v2-login-illustration-light.png"
            alt="Authentication Illustration"
            className="max-h-[480px] w-auto object-contain dark:hidden transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/cards/illustration-daisy-light.png";
            }}
          />
          <img
            src="/images/pages/auth-v2-login-illustration-dark.png"
            alt="Authentication Illustration"
            className="max-h-[480px] w-auto object-contain hidden dark:block transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/cards/illustration-daisy-dark.png";
            }}
          />
          <div className="mt-8 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Enterprise Multi-Tenant SaaS Platform
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Unified enterprise resource planning, workforce operations, automated payroll, attendance tracking, and POS commerce.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Form Column (Sneat Pro Auth Card) ────────────────── */}
      <div className="col-span-1 lg:col-span-5 xl:col-span-4 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-card">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoLightUrl} alt="Logo" className="h-8 w-auto object-contain" />
          </Link>
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          {/* ── 2FA MFA Step ───────────────────────────── */}
          {isMfaStep ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setIsMfaStep(false);
                  setMfaCode("");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to sign in</span>
              </button>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h3>
                <p className="text-xs text-muted-foreground">
                  {isBackupMode
                    ? "Enter one of your emergency recovery backup codes."
                    : "Enter the 6-digit verification code from your Authenticator app."}
                </p>
              </div>

              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isBackupMode ? "8-Character Recovery Code" : "6-Digit Security Code"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={isBackupMode ? 10 : 6}
                      autoFocus
                      placeholder={isBackupMode ? "ABCD1234" : "000000"}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="h-10 text-center tracking-widest font-mono text-base font-bold bg-muted/30"
                    />
                    <KeyRound className="size-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-bold bg-primary text-primary-foreground">
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <ShieldCheck className="size-4 mr-2" />}
                  Verify & Sign In
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupMode(!isBackupMode);
                      setMfaCode("");
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    {isBackupMode ? "Use Authenticator App Code instead" : "Lost your device? Use a recovery backup code"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ── Primary Sign In / Sign Up Form ─────────── */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold tracking-tight">
                  {mode === "signin" ? `Welcome to ${appName}!` : "Create your workspace"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {mode === "signin"
                    ? "Please sign in to your workspace account to continue"
                    : "Get started with your multi-tenant organization account"}
                </p>
              </div>

              {mode === "signin" && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Demo Admin Access
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("gowthamtooquik@gmail.com");
                        setPassword("admin123");
                      }}
                      className="text-[11px] font-bold text-primary underline hover:text-primary/80 cursor-pointer"
                    >
                      Fill Credentials
                    </button>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground pt-0.5">
                    <span>gowthamtooquik@gmail.com</span>
                    <span>admin123</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 pl-9 text-xs"
                        required
                        autoFocus
                      />
                      <User className="size-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Work Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 pl-9 text-xs"
                      required
                      autoFocus={mode === "signin"}
                    />
                    <Mail className="size-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Password</Label>
                    {mode === "signin" && (
                      <Link to="/auth" search={{ mode: "signin" }} className="text-xs text-primary hover:underline font-medium">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="············"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pl-9 pr-10 text-xs"
                      required
                    />
                    <Lock className="size-4 text-muted-foreground absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-muted-foreground font-medium cursor-pointer">
                    Remember session
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs">
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {mode === "signin" ? "Sign In to Workspace" : "Create Workspace Account"}
                </Button>
              </form>

              {/* Social Login Options */}
              {anySocialVisible && (
                <div className="space-y-4 pt-2">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-border w-full" />
                    <span className="bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase">
                      or continue with
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {googleVisible && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-lg hover:border-primary/50"
                        onClick={() => {
                          window.location.href = `${API_BASE}/auth/oauth/google`;
                        }}
                      >
                        <svg className="size-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </Button>
                    )}

                    {secondaryProviders.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-lg hover:border-primary/50"
                        onClick={() => {
                          window.location.href = `${API_BASE}/auth/oauth/${p.id}`;
                        }}
                      >
                        {p.icon}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Toggle Footer */}
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  {mode === "signin" ? "New on our platform?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {mode === "signin" ? "Create an account" : "Sign in instead"}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Notice */}
        <div className="text-center text-[11px] text-muted-foreground/60">
          <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
