import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Cpu,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/super-login")({
  component: SuperLoginPage,
  head: () => ({
    meta: [
      { title: "Super Admin Console Sign In — Master HRMS & Global ERP" },
      {
        name: "description",
        content: "Secure root administrator authentication portal for Master HRMS & Global ERP.",
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
        } catch {}
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter both administrator email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
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
      toast.success("Authentication successful. Welcome to Super Console.");
      navigate({ to: "/super" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Super administrator authentication failed");
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
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* ── Left Hero / Enterprise Platform Orchestrator (7-8 Cols on Desktop) ────────── */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 relative bg-gradient-to-br from-primary/10 via-background to-secondary/30 items-center justify-center p-12 overflow-hidden border-r border-border/60">
        {/* Subtle Decorative Background Glows */}
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
              Multi-tenant architecture controls, global security registries, subscription lifecycle orchestration, and hardware bridges.
            </p>
          </div>

          {/* Sneat Pro 3D Platform Infrastructure Showcase */}
          <div className="relative mx-auto max-w-lg">
            <Card className="border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl p-6 space-y-5 text-left transform transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between border-b pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-3 rounded-full bg-red-400/80" />
                  <div className="size-3 rounded-full bg-amber-400/80" />
                  <div className="size-3 rounded-full bg-emerald-400/80" />
                  <span className="text-xs font-bold text-foreground ml-2 font-mono">Root Orchestrator v2.8.4</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-mono font-bold">
                  Cluster Live 99.99%
                </Badge>
              </div>

              {/* Infrastructure Security Pillars */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                    <Layers className="size-3.5" /> Multi-Tenant Fleet
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Strict <strong className="text-foreground">tenant_id</strong> database isolation layer
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-bold">
                    <KeyRound className="size-3.5" /> Security & RBAC
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Role matrix, 2FA TOTP, and token invalidation
                  </div>
                </div>
              </div>

              {/* System Engine Specifications */}
              <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Server className="size-3.5 text-primary" /> Database Engine
                  </span>
                  <span className="font-mono font-bold text-foreground">MySQL Realtime 8.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-purple-500" /> Biometric Hardware Bridge
                  </span>
                  <span className="font-mono text-foreground font-semibold">Active Sync Service</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Platform Encryption
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">256-Bit TLS End-to-End</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Right Auth Form Panel (4-5 Cols) ─────────────────────────── */}
      <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Platform Logo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.webp"
                alt="Master Platform"
                className="h-9 w-auto object-contain"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Super Admin Sign In</h2>
            <p className="text-xs text-muted-foreground">
              Enter authorized root credentials to access the platform orchestration console.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Administrator Email</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="admin@masterhrms.com"
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

            <div className="pt-2 text-center space-y-2">
              <Link
                to="/auth"
                className="text-xs text-muted-foreground hover:text-primary transition-colors block"
              >
                Switch to Employee / Tenant Workspace Sign In &rarr;
              </Link>
              <p className="text-[11px] text-muted-foreground/60 font-mono">
                All platform access attempts are audited and logged.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
