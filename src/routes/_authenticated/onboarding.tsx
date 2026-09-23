import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Globe2,
  Store,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("retail");
  const [companySize, setCompanySize] = useState("10-50");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const [branchName, setBranchName] = useState("Headquarters / Main Store");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/auth/me");
        if (me?.profile?.tenantId) {
          // If already onboarded, continue
        }
      } catch {
        navigate({ to: "/auth" });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function handleFinishOnboarding() {
    setLoading(true);
    try {
      const finalSlug =
        slug ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
          "-" +
          Math.random().toString(36).slice(2, 6);

      let resultToken: string | null = null;
      try {
        const result = await api.post("/auth/bootstrap-tenant", {
          name,
          slug: finalSlug,
        });
        if (result?.token) {
          setToken(result.token);
          resultToken = result.token;
        }
      } catch (bootErr: any) {
        // If tenant already bootstrapped, proceed to update onboarding details
        console.warn("Bootstrap step skipped or already exists:", bootErr.message);
      }

      // Configure onboarding details (branch, timezone, phone)
      try {
        await api.post("/workspace/onboarding", {
          orgName: name,
          timezone,
          branchName,
          phone: branchPhone || phone,
          address: branchAddress || address,
        });
      } catch (onbErr) {
        console.warn("Workspace onboarding record update:", onbErr);
      }

      qc.clear();
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      toast.success("Workspace setup completed! Welcome aboard.");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to finalize workspace setup");
      navigate({ to: "/dashboard" });
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

  const steps = [
    { id: 1, title: "Organization", icon: Building2, desc: "Company Profile" },
    { id: 2, title: "Regional", icon: Globe2, desc: "Currency & Time" },
    { id: 3, title: "First Branch", icon: Store, desc: "Warehouse / Store" },
    { id: 4, title: "Launch", icon: CheckCircle2, desc: "Ready to Operate" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl space-y-6 my-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
            <Sparkles className="size-3.5" /> Workspace Setup Wizard
          </div>
          <h1 className="text-2xl font-black tracking-tight">Configure Your Enterprise ERP</h1>
          <p className="text-xs text-muted-foreground">
            Complete the 4 steps below to customize your organization's environment.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? "bg-card border-primary shadow-sm ring-1 ring-primary/20"
                    : isDone
                    ? "bg-primary/5 border-primary/30 text-primary"
                    : "bg-muted/40 border-border/50 text-muted-foreground opacity-60"
                }`}
              >
                <div className="flex justify-center mb-1">
                  {isDone ? (
                    <Check className="size-4 text-primary" />
                  ) : (
                    <Icon className={`size-4 ${isCurrent ? "text-primary" : ""}`} />
                  )}
                </div>
                <p className="text-[11px] font-bold leading-tight truncate">{s.title}</p>
                <p className="text-[9px] text-muted-foreground truncate hidden sm:block">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Wizard Card Body */}
        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Step 1: Organization Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Provide the official business entity name and unique workspace slug.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Company / Org Name</Label>
                    <Input
                      placeholder="e.g. Acme Global Logistics"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Workspace URL Subdomain <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">erp.domain.com/</span>
                      <Input
                        placeholder="acme"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail & Stores</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="it_services">Technology & Services</SelectItem>
                          <SelectItem value="logistics">Logistics & Supply</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Company Size</Label>
                      <Select value={companySize} onValueChange={setCompanySize}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1 – 10 Team Members</SelectItem>
                          <SelectItem value="10-50">10 – 50 Employees</SelectItem>
                          <SelectItem value="50-200">50 – 200 Employees</SelectItem>
                          <SelectItem value="200+">200+ Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => {
                      if (!name) {
                        toast.error("Please provide a company name.");
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="font-bold gap-2"
                  >
                    Continue to Regional Setup <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Step 2: Currency & Regional Preferences</h3>
                  <p className="text-xs text-muted-foreground">
                    Set up default operational currency, tax formatting, and base timezone.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Operating Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
                        <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                        <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                        <SelectItem value="AED">AED (د.إ) — UAE Dirham</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Base Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
                    <ArrowLeft className="size-4" /> Previous
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} className="font-bold gap-2">
                    Continue to Branch Setup <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Step 3: First Primary Store / Warehouse</h3>
                  <p className="text-xs text-muted-foreground">
                    Initial branch for inventory stock control, POS billing terminals, and employee assignment.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Store / Warehouse Name</Label>
                    <Input
                      placeholder="e.g. Flagship Store & Main Warehouse"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Location / Address</Label>
                    <Input
                      placeholder="e.g. Sector 62, Commercial Hub"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Branch Contact Phone</Label>
                    <Input
                      placeholder="+91 98765 00000"
                      value={branchPhone}
                      onChange={(e) => setBranchPhone(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
                    <ArrowLeft className="size-4" /> Previous
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="font-bold gap-2">
                    Review & Complete <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1 text-center py-2">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-black text-xl">All Set! Ready to Launch</h3>
                  <p className="text-xs text-muted-foreground">
                    Your enterprise workspace is configured. Click below to initialize your operational dashboard.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Company Name:</span>
                    <span className="font-bold text-foreground">{name || "Acme Logistics"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Operating Currency:</span>
                    <span className="font-medium text-foreground">{currency} ({timezone})</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">First Branch:</span>
                    <span className="font-bold text-foreground">{branchName}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={handleFinishOnboarding}
                    disabled={loading}
                    className="font-bold gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Provisioning ERP...
                      </>
                    ) : (
                      <>
                        Launch Workspace Dashboard <ArrowRight className="size-4" />
                      </>
                    )}
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
