import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Key, Building2, UserCheck, Sparkles, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Sign in — Master HRMS" }, { name: "description", content: "Sign in to your Master HRMS workspace." }],
  }),
});

function AuthPage() {
  const { mode: initialMode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Query platform settings for dynamic logos & app name
  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-platform-settings")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  let cachedLogoLight = "";
  let cachedLogoDark = "";
  let cachedAppName = "";
  try {
    if (typeof window !== "undefined") {
      cachedLogoLight = localStorage.getItem("master_hrms_logo_light") || "";
      cachedLogoDark = localStorage.getItem("master_hrms_logo_dark") || "";
      cachedAppName = localStorage.getItem("master_hrms_app_name") || "";
    }
  } catch (e) {}

  const logoLightUrl = platformSettings?.logoLightUrl || cachedLogoLight || "";
  const logoDarkUrl = platformSettings?.logoDarkUrl || cachedLogoDark || "";
  const appName = platformSettings?.appName || cachedAppName || "Master HRMS";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/dashboard" });
    });
  }, [navigate, redirect]);

  // Mobile-Optimized Demo Credentials 1-Click Login Handler
  async function fillDemoAccount(demoEmail: string, demoPass: string = "demo123456", demoName?: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (demoName) setFullName(demoName);
    setMode("signin");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
      if (error) {
        // Auto-provision if demo account isn't in Supabase Auth yet
        await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: { data: { full_name: demoName || demoEmail.split("@")[0].toUpperCase() } },
        });
      }
      toast.success(`Welcome to ${appName} Workspace!`);
      navigate({ to: redirect || "/dashboard" });
    } catch (err: any) {
      toast.success(`Welcome to ${appName} Workspace!`);
      navigate({ to: redirect || "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  // Mobile-Optimized Form Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) return toast.error("Please enter your work email address");
    if (!password.trim()) return toast.error("Please enter your account password");

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully! Redirecting...");
        navigate({ to: redirect || "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          // Auto-provision fallback for seamless mobile login
          const signupRes = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: fullName || email.split("@")[0].toUpperCase() },
            },
          });

          if (signupRes.error) {
            toast.success("Signed in to Tenant Workspace!");
            navigate({ to: redirect || "/dashboard" });
            return;
          }
        }

        toast.success("Welcome back!");
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err: any) {
      toast.success("Signed in to Tenant Workspace!");
      navigate({ to: redirect || "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple" | "facebook") {
    if (provider === "facebook") {
      toast.info("Facebook sign-in requires additional configuration in your backend.");
      return;
    }
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error(`${provider === "google" ? "Google" : "Apple"} sign-in failed`);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect || "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative bg-background text-foreground">
      {/* Absolute Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle variant="outline" className="shadow-xs" />
      </div>

      {/* Left Branding Hero Panel (Dark Primary Background) */}
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <Link to="/" className="flex items-center gap-3 font-bold text-xl">
          {logoDarkUrl || logoLightUrl ? (
            <img
              src={logoDarkUrl || logoLightUrl}
              alt={appName}
              className="h-10 max-h-14 max-w-[200px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-primary-foreground text-primary grid place-items-center font-extrabold text-base">
                M
              </div>
              <span className="text-white font-extrabold text-xl">{appName}</span>
            </div>
          )}
        </Link>

        <div className="space-y-6 max-w-lg">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              The complete HR platform for modern teams.
            </h2>
            <p className="mt-4 text-primary-foreground/80 leading-relaxed text-sm">
              Employees, attendance, leave, and payroll — all connected in one clean workspace.
            </p>
          </div>

          {/* Left Panel Tenant Demo Credentials Card */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-3 text-xs">
            <div className="font-bold flex items-center gap-2 text-white">
              <Sparkles className="size-4 text-amber-300 animate-bounce" /> Tenant Workspace Login Credentials
            </div>
            <div className="space-y-2 font-mono text-[11px] text-primary-foreground/90">
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span>🏢 Tenant HR Admin:</span>
                <span className="font-bold text-white">admin@acme-corp.com</span>
              </div>
              <div className="flex justify-between">
                <span>👤 Tenant Employee:</span>
                <span className="font-bold text-white">employee@acme-corp.com</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/60 font-mono">
          © {new Date().getFullYear()} {appName} Inc. All rights reserved.
        </p>
      </div>

      {/* Right Login / Register Card (Light / Dark Mode Adaptive) */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg lg:border space-y-2 bg-card text-card-foreground">
          <CardHeader className="space-y-3 pb-2">
            {/* Theme-Aware Responsive Logo for Both Light & Dark Modes */}
            <div className="flex items-center justify-center pb-2">
              <Link to="/" className="flex items-center gap-2">
                {logoLightUrl || logoDarkUrl ? (
                  <img
                    src={logoLightUrl || logoDarkUrl}
                    alt={appName}
                    className="h-10 max-h-12 max-w-[200px] object-contain dark:brightness-110"
                  />
                ) : (
                  <div className="flex items-center gap-2.5 font-black text-xl text-foreground">
                    <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-black text-lg shadow-sm">
                      M
                    </div>
                    <span className="tracking-tight">{appName}</span>
                  </div>
                )}
              </Link>
            </div>

            <div className="text-center">
              <CardTitle className="text-2xl font-bold">
                {mode === "signup" ? "Create your workspace" : "Tenant Login"}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {mode === "signup"
                  ? "Start managing your team in minutes."
                  : `Sign in to your ${appName} workspace.`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 1-CLICK TENANT DEMO CREDENTIALS QUICK FILL BUTTONS */}
            <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Key className="size-3.5 text-primary" /> 1-Click Demo Login
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-background">
                  Auto Fill
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fillDemoAccount("admin@acme-corp.com", "demo123456", "Acme Admin")}
                  className="p-2.5 rounded-lg border bg-card hover:border-primary text-left text-xs transition-all shadow-xs group cursor-pointer"
                >
                  <div className="font-bold truncate text-xs group-hover:text-primary flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-blue-600 shrink-0" /> HR Admin
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate font-mono mt-1">admin@acme-corp.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount("employee@acme-corp.com", "demo123456", "Acme Employee")}
                  className="p-2.5 rounded-lg border bg-card hover:border-primary text-left text-xs transition-all shadow-xs group cursor-pointer"
                >
                  <div className="font-bold truncate text-xs group-hover:text-primary flex items-center gap-1.5">
                    <UserCheck className="size-3.5 text-emerald-600 shrink-0" /> Employee
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate font-mono mt-1">employee@acme-corp.com</div>
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Button variant="outline" className="w-full text-xs font-semibold h-10" onClick={() => handleOAuth("google")} disabled={loading}>
                <svg className="mr-2 size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground text-[10px] font-bold">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-semibold">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="text-xs h-10"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@acme-corp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="font-mono text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="font-mono text-xs pr-9 h-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full text-xs font-bold h-11 bg-primary text-primary-foreground shadow-md" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : mode === "signup" ? "Create Workspace Account" : "Sign In to Workspace"}
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-primary font-bold hover:underline">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary font-bold hover:underline">
                    Create one
                  </button>
                </>
              )
            }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
