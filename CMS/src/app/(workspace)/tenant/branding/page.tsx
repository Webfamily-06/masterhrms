'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

export default function TenantBrandingPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading, profile } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin || profile?.roles?.includes("hr_admin");
  const queryClient = useQueryClient();

  const [titleText, setTitleText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#0d6efd");
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-settings-branding"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/settings");
      return res?.data || res || {};
    },
    enabled: isAuthorized,
  });

  useEffect(() => {
    if (!data) return;
    const b = data.brand || {};
    const c = data.company || {};
    const t = data.tenant || {};
    setTitleText(b.titleText || t.name || "");
    setFooterText(b.footerText || "");
    setLogoUrl(b.logoDark || t.logoUrl || "");
    setThemeColor(b.themeColor || "#0d6efd");
    setCompanyName(c.companyName || c.name || t.name || "");
    setTaxNumber(c.taxNumber || "");
    setAddress(c.address || "");
    setCity(c.city || "");
    setState(c.state || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");
  }, [data]);

  const saveBrandMutation = useMutation({
    mutationFn: async () => {
      await api.put("/workspace/settings/brand", {
        titleText,
        footerText,
        logoUrl,
        logoDark: logoUrl,
        themeColor,
        currency: "INR",
        currencySymbol: "₹",
      });
      await api.put("/workspace/settings/company", {
        companyName,
        taxNumber,
        address,
        city,
        state,
        country: "India",
        phone,
        email,
      });
    },
    onSuccess: () => {
      toast.success("Tenant branding and company profile saved.");
      queryClient.invalidateQueries({ queryKey: ["workspace-settings-branding"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me-profile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save branding settings.");
    },
  });

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant Branding" requiredPermission="workspace.settings.manage" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Branding & Legal Identity"
        description="Single source of truth for organization logo, theme accent, and legal details used across Payslips, Tax Invoices, Offer Letters, and Careers."
        actions={
          <Button
            size="sm"
            disabled={saveBrandMutation.isPending || isLoading}
            onClick={() => saveBrandMutation.mutate()}
            className="gap-1.5"
          >
            <i className={saveBrandMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
            Save Branding
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Brand Identity & Visuals</CardTitle>
            <CardDescription className="text-xs">
              Configure your tenant title, logo URL, and primary brand color.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Workspace Display Title</Label>
              <Input
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Organization display name"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tenant Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/uploads/branding/logo.png or https://..."
                className="text-xs"
              />
              {logoUrl && (
                <div className="mt-2 p-3 rounded-lg border border-border/70 bg-muted/20 inline-flex items-center gap-3">
                  <img src={logoUrl} alt="Tenant Logo Preview" className="h-10 max-w-40 object-contain" />
                  <span className="text-[11px] text-muted-foreground">Live preview</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Primary Brand Accent</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-9 w-12 rounded-md border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="text-xs w-36"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Footer Text</Label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Footer note printed on payslips and emails"
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Legal & Registered Company Details</CardTitle>
            <CardDescription className="text-xs">
              Used on statutory registers, HSN 998517 billing invoices, and Form 16 exports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Legal Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Registered entity name"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">GSTIN / Tax Registration No.</Label>
                <Input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="33AABCP1234F1Z5"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Registered Street Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full office address"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chennai" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Tamil Nadu" className="text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@company.com" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 44 2345 6789" className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
