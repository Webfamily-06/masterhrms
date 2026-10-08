import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Save, Loader2, Image, Palette } from "lucide-react";
import { useTenantBranding } from "@/lib/useTenantBranding";

export const Route = createFileRoute("/_authenticated/tenant/branding")({
  component: TenantBrandingPage,
  head: () => ({
    meta: [{ title: "Branding & White-label — Master HRMS" }],
  }),
});

function TenantBrandingPage() {
  const qc = useQueryClient();
  const { branding } = useTenantBranding();

  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    logoDark: "",
    faviconUrl: "",
    primaryColor: "#FF6B00",
  });

  useEffect(() => {
    if (branding) {
      setForm({
        name: branding.name || "",
        logoUrl: branding.logoUrl || "",
        logoDark: branding.logoDark || "",
        faviconUrl: branding.faviconUrl || "",
        primaryColor: branding.primaryColor || "#FF6B00",
      });
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      // Update tenant branding settings
      localStorage.setItem("master_hrms_primary_color", payload.primaryColor);
      document.documentElement.style.setProperty("--primary", payload.primaryColor);
      return await api.put("/company-profile", {
        tradingName: payload.name,
        logoUrl: payload.logoUrl,
        primaryColor: payload.primaryColor,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });
      toast.success("Workspace branding updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save branding.");
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-primary" />
          Workspace Branding & White-Label
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize logos, favicons, and corporate brand color palette.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Visual Identity & Assets</CardTitle>
          <CardDescription className="text-xs">
            Applied across login page, sidebar, customer notifications, and employee payslips.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Workspace Brand Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. MasterHRMS"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-muted-foreground" /> Light Logo URL
              </Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="/logo.webp"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-muted-foreground" /> Dark Mode Logo URL
              </Label>
              <Input
                value={form.logoDark}
                onChange={(e) => setForm({ ...form, logoDark: e.target.value })}
                placeholder="/white-logo.webp"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Browser Favicon URL</Label>
              <Input
                value={form.faviconUrl}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                placeholder="/favicon.webp"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Primary Theme Color
              </Label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Branding
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
