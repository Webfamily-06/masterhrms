import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Server,
  KeyRound,
  CheckCircle2,
  Building2,
  Database,
  Store,
  Smartphone,
  Layers,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/super-login")({
  component: SuperLoginPage,
  head: () => ({
    meta: [
      { title: "Super Admin Console Sign In — Master Platform & Enterprise ERP" },
      {
        name: "description",
        content: "Authorized root administrator authentication portal for Master HRMS & Multi-Tenant Global ERP.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function SuperLoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 2FA TOTP Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);

  // Fetch real-time platform branding & logo
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

  const logoUrl = platformSettings?.logoLightUrl || "/logo.webp";
  const appName = platformSettings?.appName || "Master Platform";

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
      toast.error("Please enter your administrator work email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: cleanEmail,
        password,
      });

      // Check if user requires Two-Factor Authentication
      if (res.requires2FA) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken);
        setMfaCode("");
        toast.info("Two-Factor Authentication code required.");
        setLoading(false);
        return;
      }

      const roles: string[] = res.roles || res.user?.roles || [];
      const isSuper = roles.includes("super_admin");
      if (!isSuper) {
        toast.error("Access denied: This account lacks Super Administrator privileges.");
        setLoading(false);
        return;
      }

      setToken(res.token);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      toast.success("Authentication successful. Welcome to Super Admin Console.");
      navigate({ to: "/super" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Super administrator authentication failed.");
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      toast.error(isBackupMode ? "Please enter your recovery backup code." : "Please enter your 6-digit authenticator code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/verify-login", {
        mfaToken,
        code: cleanCode,
      });

      const roles: string[] = res.roles || res.user?.roles || [];
      const isSuper = roles.includes("super_admin");
      if (!isSuper) {
        toast.error("Access denied: This account lacks Super Administrator privileges.");
        setLoading(false);
        return;
      }

      setToken(res.token);
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      toast.success("Security verification successful. Welcome to Super Console.");
      navigate({ to: "/super" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification code failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verifying root session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid lg:grid-cols-12 relative overflow-hidden font-sans">
      {/* Top Controls: Back link + Theme Toggle */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-md shadow-2xs"
        >
          <ArrowLeft className="size-3.5" />
          <span>Home</span>
        </Link>
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* ─── Left Hero / Enterprise Platform Governance Showcase (7-8 Cols Desktop) ─── */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 relative bg-gradient-to-br from-primary/10 via-background to-secondary/30 items-center justify-center p-12 overflow-hidden border-r border-border/60">
        {/* Subtle Decorative Ambient Background Glows */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-xl text-center space-y-8 relative z-10">
          <div className="space-y-3">
            <Badge variant="outline" className="px-3.5 py-1 text-xs font-mono font-bold tracking-wider uppercase border-primary/30 text-primary bg-primary/5">
              <ShieldCheck className="size-3.5 mr-1.5" /> Root Command Orchestrator
            </Badge>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Global Platform Governance
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Multi-tenant workspace orchestration, subscription fleet management, global security matrix, and database operations.
            </p>
          </div>

          {/* Enterprise Platform Infrastructure Showcase Card */}
          <div className="relative mx-auto max-w-lg">
            <Card className="border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl p-6 space-y-5 text-left transform transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between border-b pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-3 rounded-full bg-red-400/80" />
                  <div className="size-3 rounded-full bg-amber-400/80" />
                  <div className="size-3 rounded-full bg-emerald-400/80" />
                  <span className="text-xs font-bold text-foreground ml-2 font-mono">Platform Governance Engine</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-mono font-bold">
                  All Systems Operational
                </Badge>
              </div>

              {/* Infrastructure Pillars */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                    <Building2 className="size-3.5" /> Tenant Workspace Fleet
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Strict database isolation layer & custom domain routing
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-bold">
                    <KeyRound className="size-3.5" /> Security & RBAC Matrix
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Role permissions, TOTP 2FA, and granular audit trails
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <Database className="size-3.5" /> Direct Database Engine
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Realtime connection pooling & high-concurrency replication
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <Store className="size-3.5" /> Addon Ecosystem
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Ecosystem app marketplace, subscription tiers & webhooks
                  </div>
                </div>
              </div>

              {/* System Security Specifications */}
              <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Server className="size-3.5 text-primary" /> Multi-Tenant Isolation
                  </span>
                  <span className="font-mono font-bold text-foreground">Active Tenant Partitioning</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-500" /> Platform Encryption
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">TLS 256-Bit End-to-End</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Right Auth Form Panel (4-5 Cols) ─── */}
      <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Platform Logo */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt={appName}
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.webp";
                }}
               loading="lazy"/>
            </Link>
          </div>

          {/* MFA 2FA Challenge View */}
          {isMfaStep ? (
            <div className="space-y-5 animate-fadeIn">
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

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Smartphone className="size-4" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Two-Factor Authentication</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isBackupMode
                    ? "Enter an emergency 8-character recovery backup code."
                    : "Enter the 6-digit verification code from your Authenticator app."}
                </p>
              </div>

              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isBackupMode ? "Recovery Backup Code" : "6-Digit Security Code"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={isBackupMode ? "ABCD-1234" : "000000"}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="h-10 pl-9 font-mono text-center tracking-widest text-sm"
                      maxLength={isBackupMode ? 16 : 6}
                      autoFocus
                      required
                    />
                    <KeyRound className="size-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setIsBackupMode(!isBackupMode)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    {isBackupMode ? "Use Authenticator App" : "Use Emergency Backup Code"}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 mr-2" /> Verify Security Code
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* Standard Root Credential Sign-In Form */
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight">Super Admin Sign In</h2>
                <p className="text-xs text-muted-foreground">
                  Enter authorized root administrative credentials to access the global orchestration console.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Administrator Work Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="admin@yourdomain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 pl-9 text-xs"
                      required
                      autoFocus
                    />
                    <Mail className="size-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
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
                    id="rememberMeSuper"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="rememberMeSuper" className="text-xs text-muted-foreground font-medium cursor-pointer">
                    Remember root session
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Authenticating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 mr-2" /> Sign In to Super Console
                    </>
                  )}
                </Button>

                <div className="pt-3 text-center space-y-3 border-t border-border/40">
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    <span>Switch to Employee / Workspace Sign In</span>
                    <ArrowRight className="size-3" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground/60 font-mono">
                    All root access attempts and administrative sessions are audited.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
