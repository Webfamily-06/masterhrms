import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save, Loader2, MapPin, Mail, Phone, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenant/company-profile")({
  component: TenantCompanyProfilePage,
  head: () => ({
    meta: [{ title: "Company Profile & Billing Address — Master HRMS" }],
  }),
});

function TenantCompanyProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    legalName: "",
    tradingName: "",
    taxId: "",
    registrationNumber: "",
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tenant-company-profile"],
    queryFn: async () => {
      try {
        const res = await api.get("/company-profile");
        return res?.data || res;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        legalName: profile.legalName || profile.name || "",
        tradingName: profile.tradingName || profile.name || "",
        taxId: profile.taxId || "",
        registrationNumber: profile.registrationNumber || "",
        email: profile.email || "",
        phone: profile.phone || "",
        website: profile.website || "",
        addressLine1: profile.addressLine1 || profile.address || "",
        addressLine2: profile.addressLine2 || "",
        city: profile.city || "",
        state: profile.state || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "India",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.put("/company-profile", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-company-profile"] });
      toast.success("Company profile and billing address saved successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update company profile.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-primary" />
          Company Profile & Billing Address
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Corporate entity identification, registered tax numbers, and invoice billing address.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Legal Entity Identification</CardTitle>
            <CardDescription className="text-xs">
              This information appears on generated employee tax slips, invoices, and formal documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Legal Registered Name</Label>
              <Input
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                placeholder="e.g. Master Technologies Private Limited"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Trading Name / Brand Name</Label>
              <Input
                value={form.tradingName}
                onChange={(e) => setForm({ ...form, tradingName: e.target.value })}
                placeholder="e.g. MasterHRMS"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tax ID / GSTIN / VAT Number</Label>
              <Input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Corporate Registration No. (CIN/LLPIN)</Label>
              <Input
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                placeholder="e.g. U72200KA2026PTC123456"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Contact Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="billing@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Contact Phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Registered Billing Address
            </CardTitle>
            <CardDescription className="text-xs">
              Primary office headquarters used for subscription billing and tax compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Street Address Line 1</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="Building, Suite, Street name"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Street Address Line 2 (Optional)</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Floor, Landmark"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Bengaluru"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">State / Province</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Karnataka"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Postal / ZIP Code</Label>
              <Input
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="560001"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="India"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
