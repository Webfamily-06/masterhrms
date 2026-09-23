import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Forgot Password — Master Workspace ERP" },
      { name: "description", content: "Request a password reset code for your workspace account." },
    ],
  }),
});

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your account email.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      setMaskedEmail(res.maskedEmail || email);
      toast.success(res.message || "Password reset instructions sent.");
    } catch (err: any) {
      toast.error(err.message || "Unable to send password reset code.");
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
            <KeyRound className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Forgot Password</h1>
          <p className="text-xs text-muted-foreground">
            Enter your work email address to receive a secure password recovery code
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Account Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    We will send a 6-digit one-time verification code to this email.
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full font-bold h-10 gap-2 mt-2">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Dispatching Reset Code...
                    </>
                  ) : (
                    <>
                      Send Reset Code <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="size-3" /> Return to Login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Reset Code Dispatched
                    </p>
                    <p className="text-muted-foreground">
                      We have sent a verification code to <span className="font-mono font-medium text-foreground">{maskedEmail}</span>.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/reset-password",
                        search: { email } as any,
                      })
                    }
                    className="w-full font-bold h-10 gap-2"
                  >
                    Enter Reset Code & Change Password <ArrowRight className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="w-full text-xs h-9"
                  >
                    Try a different email
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
