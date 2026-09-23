import React, { useState, useEffect } from "react";
import { Lock, LogIn, RefreshCw, X, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, setToken, clearToken } from "@/lib/api";

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleSessionExpired(event: any) {
      // Don't show modal if already on public auth pages
      if (
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/auth") ||
          window.location.pathname.startsWith("/super-login") ||
          window.location.pathname.startsWith("/session-expired"))
      ) {
        return;
      }
      setOpen(true);
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  async function handleFastLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      if (data.token) {
        setToken(data.token);
        toast.success("Session re-authenticated successfully!");
        setOpen(false);
        setPassword("");
        // Reload current data queries
        window.dispatchEvent(new Event("auth-token-changed"));
        return;
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFullLogout() {
    clearToken();
    setOpen(false);
    window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !loading && setOpen(isOpen)}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 grid place-items-center mb-1">
            <Lock className="size-6 stroke-[1.75]" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Session Expired
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Your login token has expired. Enter your password below to quickly resume without losing your current screen state.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFastLogin} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">Password</Label>
              <a href="/auth?tab=forgot" className="text-[11px] text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 font-bold text-xs gap-1.5 bg-primary text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <LogIn className="size-3.5" /> Resume Session
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleFullLogout}
              className="h-9 text-xs font-medium"
            >
              Sign Out
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
