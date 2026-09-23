import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
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
  ArrowRight,
  Sparkles,
  KeyRound,
  AlertCircle,
  Building2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign In — Master Workspace ERP" },
      { name: "description", content: "Access your enterprise workspace, HRMS, and business management suite." },
    ],
  }),
});

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // 2FA Challenge state
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

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

  const appName = platformSettings?.appName || "Master Workspace ERP";
  const logoUrl = platformSettings?.logoLightUrl || "/logo.webp";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      
      if (res.require2fa) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken);
        toast.info("Two-Factor Authentication required. Enter the verification code sent to your email.");
        setLoading(false);
        return;
      }

      if (res.token) {
        setToken(res.token);
        if (rememberMe) {
          localStorage.setItem("hrms_remember_email", email);
        } else {
          localStorage.removeItem("hrms_remember_email");
        }
        toast.success("Welcome back! Signing you in...");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/verify", {
        mfaToken,
        code: mfaCode,
      });

      if (res.token) {
        setToken(res.token);
        toast.success("Authentication confirmed! Loading workspace...");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid 2FA code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-2">
            <Building2 className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{appName}</h1>
          <p className="text-xs text-muted-foreground">
            Sign in to access your organization's centralized ERP & HRMS environment
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">
            {!isMfaStep ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 h-10 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-muted-foreground">Keep me signed in</span>
                  </label>
                  <Link
                    to="/verify-email"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Verify Email OTP
                  </Link>
                </div>

                <Button type="submit" disabled={loading} className="w-full font-bold h-10 gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to Workspace <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground">2FA Verification Code Sent</p>
                    <p className="text-muted-foreground">
                      Please enter the 6-digit one-time password dispatched to your authorized email address.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">6-Digit Security Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      className="pl-9 h-11 text-center text-lg tracking-widest font-mono font-bold"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full font-bold h-10 gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Confirm & Sign In <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsMfaStep(false)}
                  className="w-full text-xs text-muted-foreground"
                >
                  Back to email and password
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
              Don't have an enterprise workspace?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link to="/help-center" className="hover:text-foreground">Help Center</Link>
          <span>•</span>
          <Link to="/support" className="hover:text-foreground">Support</Link>
          <span>•</span>
          <Link to="/pricing" className="hover:text-foreground">Plans & Pricing</Link>
        </div>
      </div>
    </div>
  );
}
