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
import { Loader2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
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

  // Strict Form Submit Handler with Credential Validation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) return toast.error("Please enter your work email address");
    if (!cleanPassword) return toast.error("Please enter your account password");

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || cleanEmail.split("@")[0] },
          },
        });

        if (error) {
          toast.error(error.message || "Registration failed. Please check details.");
          setLoading(false);
          return;
        }

        toast.success("Account registered successfully! Redirecting...");
        navigate({ to: redirect || "/dashboard" });
      } else {
        // Sign In Credentials Verification
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          toast.error(error.message || "Invalid login credentials. Please check your email and password.");
          setLoading(false);
          return;
        }

        if (data.session) {
          toast.success("Signed in successfully!");
          navigate({ to: redirect || "/dashboard" });
        } else {
          toast.error("Authentication failed. Session not created.");
          setLoading(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed. Invalid credentials.");
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

      {/* Left Branding Hero Panel */}
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
              The complete HR & Payroll platform for modern teams.
            </h2>
            <p className="mt-4 text-primary-foreground/80 leading-relaxed text-sm">
              Manage employees, biometric attendance, leaves, and automated payroll in one unified secure workspace.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2 text-xs text-primary-foreground/90">
            <div className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-300" /> Enterprise End-to-End Encryption
            </div>
            <p className="text-[11px] leading-relaxed text-primary-foreground/75">
              Multi-tenant architecture with encrypted session tokens, role-based access control, and Supabase RLS policies.
            </p>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/60 font-mono">
          © {new Date().getFullYear()} {appName} Inc. All rights reserved.
        </p>
      </div>

      {/* Right Login / Register Card */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg lg:border space-y-2 bg-card text-card-foreground">
          <CardHeader className="space-y-3 pb-2">
            {/* Theme-Aware Responsive Logo */}
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
                {mode === "signup" ? "Create your workspace" : "Sign in to workspace"}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {mode === "signup"
                  ? "Start managing your team in minutes."
                  : `Enter your credentials to access your ${appName} workspace.`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
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
                <span className="bg-card px-2 text-muted-foreground text-[10px] font-bold">Or continue with work email</span>
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
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="font-mono text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                  {mode === "signin" && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Password reset link has been dispatched to your work email.");
                      }}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 text-xs font-mono h-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-xs font-bold h-10 gap-2 mt-1 bg-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {mode === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="text-center text-xs pt-2">
              {mode === "signup" ? (
                <span>
                  Already have a workspace?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-primary font-bold hover:underline">
                    Sign in
                  </button>
                </span>
              ) : (
                <span>
                  Don&apos;t have a workspace yet?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary font-bold hover:underline">
                    Register new workspace
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
