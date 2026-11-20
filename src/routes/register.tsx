import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Mail,
  User,
  Building2,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { TurnstileWidget, TurnstileWidgetRef } from "@/components/security/turnstile-widget";
import { COUNTRIES } from "@/lib/reference-data";
import { extractRolesFromToken, resolveDefaultRoute } from "@/lib/auth-navigation";

const searchSchema = z.object({
  redirect: z.string().optional(),
  slug: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Create Workspace Account | MasterHRMS" },
      { name: "description", content: "Register a new organization workspace with a 14-day free trial on MasterHRMS." },
    ],
  }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("India");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Verification Step State
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password Strength Assessment
  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasNumberOrSymbol;

  // Handle Initial Registration Submit
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!fullName.trim()) return toast.error("Please enter your full name.");
    if (!cleanEmail) return toast.error("Please enter your work email address.");
    if (!companyName.trim()) return toast.error("Please enter your company or organization name.");
    if (cleanPassword.length < 8) return toast.error("Password must be at least 8 characters long.");
    if (cleanPassword !== confirmPassword.trim()) return toast.error("Passwords do not match.");
    if (!termsAccepted) return toast.error("Please accept the Terms of Service and Privacy Policy.");

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        fullName: fullName.trim(),
        email: cleanEmail,
        companyName: companyName.trim(),
        country,
        password: cleanPassword,
        confirmPassword: cleanPassword,
        termsAccepted: true,
        turnstileToken: turnstileToken || undefined,
      });

      // If backend requires verification:
      if (res.requiresVerification) {
        setMaskedEmail(res.maskedEmail || cleanEmail);
        setIsVerificationStep(true);
        toast.success(res.message || "Verification code sent to your email!");
        startCooldownTimer(30);
        return;
      }

      // If backend auto-verified and issued token immediately:
      if (res.token) {
        setToken(res.token);
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success("Workspace created! Welcome to MasterHRMS.");
        const { roles } = extractRolesFromToken(res.token);
        navigate({ to: resolveDefaultRoute(roles) as any });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register. Please check your details.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  }

  // Handle Verification Code Submit
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    const cleanCode = verificationCode.trim();
    if (cleanCode.length < 6) {
      return toast.error("Please enter the complete 6-digit verification code.");
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/verify-email", {
        email: email.trim().toLowerCase(),
        code: cleanCode,
      });

      if (res.token) {
        setToken(res.token);
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success("Email verified and workspace activated! Welcome aboard.");
        const { roles } = extractRolesFromToken(res.token);
        navigate({ to: resolveDefaultRoute(roles) as any });
      } else {
        toast.success("Email verified successfully! You can now sign in.");
        navigate({ to: "/auth", search: { mode: "signin", email: email.trim().toLowerCase() } });
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Resend Verification Code
  async function handleResend() {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
      });
      toast.success(res.message || "A fresh verification code has been dispatched.");
      startCooldownTimer(res.cooldownSeconds || 30);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  function startCooldownTimer(seconds: number) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <img
            src="/logo.webp"
            alt="MasterHRMS Logo"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Master<span className="text-primary font-bold">HRMS</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isVerificationStep ? "Verify Your Email" : "Start Your 14-Day Free Trial"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {isVerificationStep
            ? `Enter the 6-digit code sent to ${maskedEmail}`
            : "No credit card required. Full access to all modules."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {!isVerificationStep ? (
              /* Step 1: Registration Form */
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name & Company Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 size-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Sarah Jenkins"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Company Name
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 size-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Acme Corporation"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Work Email */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="sarah@acmecorp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Country
                  </Label>
                  <div className="relative">
                    <Globe2 className="absolute left-3 top-3 size-4 text-slate-400 pointer-events-none" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {COUNTRIES.slice(0, 50).map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-9 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      {hasMinLength ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : (
                        <span className="size-2 rounded-full bg-slate-300" />
                      )}
                      8+ characters
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      {hasNumberOrSymbol ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : (
                        <span className="size-2 rounded-full bg-slate-300" />
                      )}
                      Numbers or symbols
                    </span>
                  </div>
                )}

                {/* Terms Acceptance */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                      required
                    />
                    <span>
                      I agree to the{" "}
                      <Link to="/legal/$slug" params={{ slug: "terms-of-service" }} className="text-primary hover:underline font-semibold" target="_blank">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/legal/$slug" params={{ slug: "privacy-policy" }} className="text-primary hover:underline font-semibold" target="_blank">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {/* Bot Protection Widget */}
                <TurnstileWidget
                  ref={turnstileRef}
                  action="signup"
                  onSuccess={(t) => setTurnstileToken(t)}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => {}}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Provisioning Workspace...
                    </>
                  ) : (
                    <>
                      Create Workspace Account <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Step 2: Email Verification Screen */
              <form onSubmit={handleVerify} className="space-y-6 text-center">
                <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <Mail className="size-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Check your inbox
                  </h3>
                  <p className="text-xs text-slate-500">
                    We've dispatched a single-use 6-digit confirmation code to:
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                    {maskedEmail}
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wider">
                    Enter 6-Digit Code
                  </Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-2xl tracking-widest h-12 max-w-[200px] mx-auto border-2 focus:border-primary"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying & Activating...
                    </>
                  ) : (
                    "Verify Email & Enter Dashboard"
                  )}
                </Button>

                <div className="pt-2 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <span>Didn't receive the email?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResend}
                    className="font-semibold text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-primary hover:underline">
                Sign in to your workspace
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
