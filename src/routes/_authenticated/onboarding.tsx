import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.user.id)
        .maybeSingle();
      if (data?.tenant_id) navigate({ to: "/dashboard" });
      else setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const finalSlug =
        slug ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.rpc("bootstrap_tenant", {
        _name: name,
        _slug: finalSlug,
      });
      if (error) throw error;
      toast.success("Workspace created!");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-secondary/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-2xl">Set up your workspace</CardTitle>
          <CardDescription>Create your company workspace to start managing your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Workspace URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">nexora.app/</span>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="acme" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
