import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
  head: () => ({
    meta: [
      { title: "Verify Your Email — Master Workspace ERP" },
      { name: "description", content: "Verify your work email address with the one-time security code." },
    ],
  }),
});

export function VerifyEmailPage() {
  const { email: initialEmail } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail || "");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown, canResend]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your work email.");
      return;
    }
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email", {
        email,
        code: otpCode,
      });

      setVerified(true);
      toast.success(res.message || "Email verified successfully!");
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify email. Code may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Please specify your email to resend code.");
      return;
    }

    setResending(true);
    try {
      const res = await api.post("/auth/resend-verification", { email });
      toast.success(res.message || "A new 6-digit code has been dispatched.");
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
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
            <Mail className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Verify Your Email</h1>
          <p className="text-xs text-muted-foreground">
            We have sent a 6-digit confirmation code to your authorized inbox
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">
            {verified ? (
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                  <CheckCircle2 className="size-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Email Confirmed!</h3>
                  <p className="text-xs text-muted-foreground">
                    Your email address has been verified. Redirecting you to sign in...
                  </p>
                </div>
                <Button
                  onClick={() => navigate({ to: "/login" })}
                  className="font-bold h-10 w-full"
                >
                  Proceed to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Your Registered Email</Label>
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
                    <Label className="text-xs font-semibold">6-Digit Verification Code</Label>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {canResend ? "Code expired?" : `Resend in ${countdown}s`}
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="pl-9 h-12 text-center text-xl tracking-widest font-mono font-bold"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!canResend || resending}
                    onClick={handleResend}
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
                  >
                    <RefreshCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending code..." : "Resend OTP Code"}
                  </Button>
                  <Link
                    to="/login"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="size-3" /> Back to Login
                  </Link>
                </div>

                <Button type="submit" disabled={loading} className="w-full font-bold h-10 gap-2 mt-4">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying Code...
                    </>
                  ) : (
                    <>
                      Confirm & Activate Account <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
