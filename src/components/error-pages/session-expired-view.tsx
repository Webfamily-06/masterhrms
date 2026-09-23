import React, { useState } from "react";
import { Lock, LogIn, ArrowRight, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, setToken } from "@/lib/api";

export interface SessionExpiredViewProps {
  redirectPath?: string;
}

export function SessionExpiredView({ redirectPath }: SessionExpiredViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Read redirect query parameter if not explicitly provided
  const targetRedirect =
    redirectPath ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") || "/dashboard"
      : "/dashboard");

  async function handleFastReauth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      if (data.token) {
        setToken(data.token);
        toast.success("Session restored successfully! Redirecting...");
        setTimeout(() => {
          window.location.href = targetRedirect;
        }, 500);
        return;
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-primary/15 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: "5s" }}
      />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Application Navbar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-border/40 relative z-10">
        <a href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.webp"
            alt="Master ERP"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground">
              Master ERP
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Authentication Gateway
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5"
          >
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            SESSION TIMEOUT
          </Badge>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="w-full max-w-md mx-auto px-6 py-8 flex flex-col items-center relative z-10 my-auto">
        {/* Animated Icon */}
        <div className="relative mb-5">
          <div className="size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/10">
            <Lock className="size-9 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-md">
            <ShieldAlert className="size-3.5" />
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl mb-2 text-center">
          Session Expired
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 leading-relaxed">
          Your active session has expired due to enterprise security inactivity limits.
          Log in below to resume your work without losing state.
        </p>

        {/* Quick Re-auth Form */}
        <div className="w-full p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
          <form onSubmit={handleFastReauth} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Email Address</Label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Password</Label>
                <a href="/auth?tab=forgot" className="text-[11px] text-primary hover:underline">
                  Forgot?
                </a>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 gap-2 font-bold bg-primary hover:bg-primary/90 text-white shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <LogIn className="size-4" /> Re-authenticate & Continue
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-border/60 text-center">
            <a
              href={`/auth?redirect=${encodeURIComponent(targetRedirect)}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <span>Go to Full Login Screen</span>
              <ArrowRight className="size-3" />
            </a>
          </div>
        </div>

        {targetRedirect && targetRedirect !== "/dashboard" && (
          <p className="mt-4 text-[11px] text-muted-foreground text-center font-mono">
            Returning to: <span className="text-foreground font-semibold">{targetRedirect}</span>
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-border/40 text-xs text-muted-foreground relative z-10 gap-2">
        <span>&copy; {new Date().getFullYear()} Master ERP. Protected by zero-trust security.</span>
        <a href="/support-dashboard" className="hover:underline hover:text-foreground transition-colors">
          IT Support
        </a>
      </footer>
    </div>
  );
}
