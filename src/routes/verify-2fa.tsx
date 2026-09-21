import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Mail,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/verify-2fa")({
  validateSearch: searchSchema,
  component: Verify2faPage,
  head: () => ({
    meta: [
      { title: "Two-Factor Authentication — Master Workspace ERP" },
      { name: "description", content: "Enter your 6-digit verification code to complete sign in." },
    ],
  }),
});

function Verify2faPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // 6 individual OTP digit boxes
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [mfaToken, setMfaToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cooldown countdown timer (default 30 seconds)
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    // Read temporary session state from sessionStorage
    const token = sessionStorage.getItem("mfa_temp_token");
    const email = sessionStorage.getItem("mfa_masked_email");
    const setupFlag = sessionStorage.getItem("mfa_is_setup") === "true";

    if (!token) {
      toast.error("No active verification session. Please sign in first.");
      navigate({ to: "/auth" });
      return;
    }

    setMfaToken(token);
    setMaskedEmail(email || "registered email");
    setIsSetup(setupFlag);

    // Focus on first input box automatically
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, [navigate]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage("");
    // Handle only numeric input
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // If user typed/pasted a single digit
    const digit = cleaned.slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);

    // Auto-advance focus to next digit box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keydown for backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move to previous box and clear it
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = "";
        setDigits(updated);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste 6-digit OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...digits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setDigits(updated);

    // Focus last filled box or verify automatically if all 6 filled
    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();

    if (pasted.length === 6) {
      // Auto-submit after small delay
      setTimeout(() => {
        executeVerify(pasted);
      }, 100);
    }
  };

  const executeVerify = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await api.post("/auth/2fa/verify-login", {
        mfaToken,
        code: codeToVerify,
      });

      if (res.token) {
        // Clean up temporary MFA session
        sessionStorage.removeItem("mfa_temp_token");
        sessionStorage.removeItem("mfa_masked_email");
        sessionStorage.removeItem("mfa_is_setup");

        setToken(res.token);
        qc.invalidateQueries({ queryKey: ["current-session-user"] });

        toast.success(
          isSetup
            ? "Two-Factor Authentication activated! Welcome to your workspace."
            : "Identity verified! Welcome back."
        );

        navigate({ to: redirect || "/dashboard" });
      } else {
        throw new Error(res.error || "Failed to verify 2FA code.");
      }
    } catch (err: any) {
      const msg = err.message || "Invalid or expired verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    executeVerify(code);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage("");

    try {
      const res = await api.post("/auth/2fa/resend", { mfaToken });
      toast.success(res.message || "A fresh verification code has been sent to your email.");
      setCooldown(res.cooldownSeconds || 30);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.message || "Unable to resend verification code. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      if (err.secondsRemaining) {
        setCooldown(err.secondsRemaining);
      }
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);
  const formattedCooldown = `00:${cooldown < 10 ? "0" : ""}${cooldown}`;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-background via-muted/10 to-background text-foreground selection:bg-primary/20">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-border/40">
        <Link to="/auth" className="flex items-center gap-2">
          <img src="/logo.webp" alt="Master HRMS" className="h-8 w-auto object-contain" />
          <span className="font-bold tracking-tight text-sm">Master ERP</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-card border border-border/70 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          {/* Logo / Shield Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck className="size-8 stroke-[1.8]" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Verify Your Identity
                </h1>
                {isSetup && (
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    Setup Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                We sent a 6-digit verification code to your registered email address.
              </p>
            </div>

            {/* Masked Email Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-mono font-medium text-foreground">
              <Mail className="size-3.5 text-primary" />
              <span>{maskedEmail}</span>
            </div>
          </div>

          {/* Error State Banner */}
          {errorMessage && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form with 6 Digits */}
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                <span>Verification Code</span>
                <span className="text-[11px] font-normal text-muted-foreground">Expires in 5 min</span>
              </div>

              {/* 6 OTP Input Boxes */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${idx + 1}`}
                    className="w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-mono font-black rounded-xl border border-input bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                ))}
              </div>
            </div>

            {/* Verify & Continue Button */}
            <Button
              type="submit"
              disabled={loading || !isComplete}
              className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Verify & Continue
                </>
              )}
            </Button>

            {/* Resend Section with Cooldown */}
            <div className="text-center pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">Didn't receive the code?</p>
              
              {cooldown > 0 ? (
                <div className="text-xs font-mono text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
                  <RefreshCw className="size-3 animate-spin text-muted-foreground/60" />
                  <span>Resend OTP in {formattedCooldown}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 transition-all"
                >
                  {resending ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3" />
                      Resend OTP
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-border/40 text-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        © 2026 TSV Global Solutions. All rights reserved. Secure 2FA Protocol.
      </footer>
    </div>
  );
}
