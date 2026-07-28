import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/super-login")({
  component: SuperLoginPage,
  head: () => ({
    meta: [
      { title: "Super Admin Login — Master HRMS" },
      { name: "description", content: "Restricted platform administrator sign-in for Master HRMS." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function SuperLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        if ((roles ?? []).some((r) => r.role === "super_admin")) {
          navigate({ to: "/super" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
      if (!isSuper) {
        await supabase.auth.signOut();
        toast.error("This account is not a super admin.");
        setLoading(false);
        return;
      }
      toast.success("Welcome, admin");
      navigate({ to: "/super" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.15),_transparent_50%)]" />
      <Link
        to="/"
        className="absolute top-6 left-6 text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
      >
        <ArrowLeft className="size-4" /> Back to site
      </Link>

      <Card className="w-full max-w-md relative border-slate-800 bg-slate-900/80 backdrop-blur text-slate-100">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto size-12 rounded-xl bg-primary/15 grid place-items-center border border-primary/30">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Super Admin Access</CardTitle>
          <CardDescription className="text-slate-400">
            Restricted area. Platform administrators only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Admin email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950/60 border-slate-800 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950/60 border-slate-800 text-slate-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign in to admin panel
            </Button>
            <p className="text-xs text-center text-slate-500 pt-2">
              All access is monitored and logged.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
