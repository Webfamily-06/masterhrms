import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Globe2,
  Palette,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Check,
  CheckCircle2,
  Upload,
  X,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPlatformDisplayBaseDomain } from "@/lib/platform-domain";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  INDUSTRIES,
  findIndustry,
  CURRENCIES,
  findCurrency,
  TIMEZONES,
  findTimezone,
  COUNTRIES,
  findCountry,
} from "@/lib/reference-data";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

// ─── Company Sizes ────────────────────────────────────────────────────────
const COMPANY_SIZES = [
  { value: "1-10",   label: "1 – 10 (Just getting started)" },
  { value: "10-50",  label: "10 – 50 employees" },
  { value: "50-200", label: "50 – 200 employees" },
  { value: "200+",   label: "200+ (Enterprise)" },
];

// ─── Step Config ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, icon: Building2, title: "Organization",    desc: "Company identity" },
  { id: 2, icon: Globe2,    title: "Regional",        desc: "Currency & timezone" },
  { id: 3, icon: Palette,   title: "Company Profile", desc: "Identity & branding" },
  { id: 4, icon: Rocket,    title: "Launch",          desc: "Review & go live" },
];

// ─── Main Component ──────────────────────────────────────────────────────
function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { branding, isDark } = useTenantBranding();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Platform base domain resolver preserving active dev port
  const displayBaseDomain = getPlatformDisplayBaseDomain();

  // Step 1 — Organization
  const [name, setName]               = useState("");
  const [slug, setSlug]               = useState("");
  const [isSlugTouched, setIsSlugTouched] = useState(false);
  const [industry, setIndustry]       = useState("information_technology_it");
  const [companySize, setCompanySize] = useState("10-50");
  const [phone, setPhone]             = useState("");
  const [address, setAddress]         = useState("");

  // Step 2 — Regional
  const [currency, setCurrency]       = useState("INR");
  const [timezone, setTimezone]       = useState("Asia/Kolkata");
  const [country, setCountry]         = useState("India");

  // Step 3 — Company Profile & Branding
  const [profileName, setProfileName]       = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [state, setState]                   = useState("");
  const [postalCode, setPostalCode]         = useState("");
  const [profilePhone, setProfilePhone]     = useState("");
  const [email, setEmail]                   = useState("");

  // Branding files / URLs
  const [logoLight, setLogoLight]           = useState<string>("");
  const [logoDark, setLogoDark]             = useState<string>("");
  const [favicon, setFavicon]               = useState<string>("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef  = useRef<HTMLInputElement>(null);
  const faviconInputRef   = useRef<HTMLInputElement>(null);

  // ─── Server-authoritative onboarding check ─────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("hrms_auth_token");
        if (!token) { navigate({ to: "/auth" }); return; }

        const status = await api.get("/workspace/onboarding-status");
        if (status?.isOnboarded === true) {
          navigate({ to: "/hrm-dashboard" });
          return;
        }
      } catch {
        // Network error fail-open
      }
      setChecking(false);
    })();
  }, [navigate]);

  // Auto-derive slug from company name if not manually modified
  function handleNameChange(val: string) {
    setName(val);
    if (!isSlugTouched) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
    // Also sync default company profile name if pristine
    if (!profileName || profileName === name) {
      setProfileName(val);
    }
  }

  function handleSlugChange(val: string) {
    setIsSlugTouched(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
    );
  }

  // File upload handler for Branding assets
  async function handleFileUpload(field: "logoLight" | "logoDark" | "favicon", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, SVG, WebP, ICO).");
      return;
    }

    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "branding");
      formData.append("tags", `branding,${field}`);

      const res = await api.upload("/v1/media/upload", formData);
      if (res?.url) {
        if (field === "logoLight") setLogoLight(res.url);
        else if (field === "logoDark") setLogoDark(res.url);
        else if (field === "favicon") setFavicon(res.url);
        toast.success(
          `${field === "favicon" ? "Favicon" : field === "logoLight" ? "Light Logo" : "Dark Logo"} uploaded successfully`
        );
      } else {
        throw new Error("Invalid response from media upload");
      }
    } catch (err: any) {
      // Local preview fallback if upload endpoint requires different permission
      const objectUrl = URL.createObjectURL(file);
      if (field === "logoLight") setLogoLight(objectUrl);
      else if (field === "logoDark") setLogoDark(objectUrl);
      else if (field === "favicon") setFavicon(objectUrl);
      toast.info("Image set for preview and will be saved with workspace.");
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = "";
    }
  }

  // ─── Finish handler ──────────────────────────────────────────────────
  async function handleFinish() {
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

      // 1. Bootstrap tenant if not yet done
      try {
        const result = await api.post("/auth/bootstrap-tenant", {
          name,
          slug: finalSlug,
        });
        if (result?.token) setToken(result.token);
      } catch (bootErr: any) {
        if (!bootErr?.status || bootErr.status !== 409) {
          console.warn("Bootstrap:", bootErr.message);
        }
      }

      // 2. POST all onboarding data
      const effectiveLegalName = profileName || name;
      const effectiveAddress   = profileAddress || address;
      const effectivePhone     = profilePhone || phone;

      await api.post("/workspace/onboarding", {
        orgName:       name,
        timezone,
        currency,
        industry,
        companySize,
        phone:         effectivePhone,
        address:       effectiveAddress,
        country,
        state,
        postalCode,
        email,
        logoLight,
        logoDark,
        favicon,
        logoUrl:       logoLight || logoDark || "",
        branchName:    "Headquarters",
        branchPhone:   effectivePhone,
        branchAddress: effectiveAddress,
      });

      qc.clear();
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });

      toast.success("Workspace is live! Welcome to MasterHRMS 🎉");
      navigate({ to: "/hrm-dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to complete workspace setup");
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying workspace…</p>
        </div>
      </div>
    );
  }

  // Resolved Labels
  const selectedIndustryItem = findIndustry(industry);
  const selectedCurrencyItem = findCurrency(currency);
  const selectedTimezoneItem = findTimezone(timezone);
  const selectedCountryItem  = findCountry(country);

  const effectiveDisplayHost = `${slug || "your-workspace"}.${displayBaseDomain}`;

  // Topbar Logo resolution
  const topbarLogoSrc = isDark
    ? logoDark || branding.logoDark || "/white-logo.webp"
    : logoLight || branding.logoUrl || "/logo.webp";

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-start py-8 px-4 relative">
      {/* ── Topbar (Platform SaaS Logo + Theme Toggle) ────────────────── */}
      <header className="w-full max-w-2xl flex items-center justify-between py-2 px-1 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={topbarLogoSrc}
            alt="Master HRMS"
            className="h-8 w-auto object-contain max-w-[170px]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
            <Sparkles className="size-3.5" /> Workspace Setup Wizard
          </div>
          <h1 className="text-2xl font-black tracking-tight">Configure Your Enterprise ERP</h1>
          <p className="text-xs text-muted-foreground">
            4 quick steps to personalize your organization's environment.
          </p>
        </div>

        {/* ── Number-based Step Indicator ─────────────────────────────── */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, idx) => {
            const isDone    = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                      isDone
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : isCurrent
                        ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                        : "bg-muted border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="size-4" /> : s.id}
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className={`text-[11px] font-semibold ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={[
                      "h-0.5 w-12 sm:w-20 mx-1 mt-[-18px] sm:mt-[-28px] transition-all duration-300",
                      isDone ? "bg-primary" : "bg-border",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step Card ───────────────────────────────────────────────── */}
        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">

            {/* ── STEP 1: Organization ─────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-base">Organization Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set up your company's core identity — this defines your workspace.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Company / Org Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Acme Global Logistics"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Subdomain Input: Subdomain FIRST, Dot, Base Domain */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Workspace Subdomain <span className="text-muted-foreground font-normal">(auto-generated)</span>
                    </Label>
                    <div className="flex items-center rounded-md border bg-muted/30 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                      <Input
                        placeholder="your-workspace"
                        value={slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        className="h-10 text-sm font-mono border-0 bg-transparent focus-visible:ring-0 rounded-none"
                      />
                      <span className="px-3 text-xs text-muted-foreground font-mono border-l bg-muted/60 whitespace-nowrap select-none py-2.5">
                        .{displayBaseDomain}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Your workspace will be accessible at{" "}
                      <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground font-semibold">
                        {effectiveDisplayHost}
                      </code>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Industry</Label>
                      <SearchableCombobox
                        options={INDUSTRIES}
                        value={industry}
                        onValueChange={setIndustry}
                        placeholder="Select industry..."
                        searchPlaceholder="Search industries..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Company Size</Label>
                      <Select value={companySize} onValueChange={setCompanySize}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Contact Phone <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        placeholder="+91 98765 00000"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Business Address <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        placeholder="Sector 62, Commercial Hub"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    onClick={() => {
                      if (!name.trim()) { toast.error("Please provide a company name."); return; }
                      setStep(2);
                    }}
                    className="font-bold gap-2"
                  >
                    Regional Setup <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Regional ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-base">Regional Preferences</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set the default currency, timezone, and operating country for all operations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Operating Currency</Label>
                    <SearchableCombobox
                      options={CURRENCIES}
                      value={currency}
                      onValueChange={setCurrency}
                      placeholder="Select currency..."
                      searchPlaceholder="Search currencies (INR, USD, EUR)..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Used for payroll, invoicing, and financial reporting across all departments.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Base Timezone</Label>
                    <SearchableCombobox
                      options={TIMEZONES}
                      value={timezone}
                      onValueChange={setTimezone}
                      placeholder="Select timezone..."
                      searchPlaceholder="Search timezones (Kolkata, Dubai, UTC)..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Attendance, shifts, and scheduled payroll runs will operate in this timezone.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Operating Country</Label>
                    <SearchableCombobox
                      options={COUNTRIES}
                      value={country}
                      onValueChange={setCountry}
                      placeholder="Select country..."
                      searchPlaceholder="Search countries..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Defines default statutory compliance, tax rules, and holiday calendars.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="font-bold gap-2">
                    Company Profile & Branding <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Company Profile & Branding ──────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-base">Company Profile</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Establish your corporate legal identity, address, contact details, and brand assets.
                  </p>
                </div>

                {/* Section A: Company Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Building2 className="size-3.5 text-primary" /> Corporate Identity & Address
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Legal Company Name</Label>
                      <Input
                        placeholder="Company Name"
                        value={profileName || name}
                        onChange={e => setProfileName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Registered Office Address</Label>
                      <Input
                        placeholder="Suite / Building / Street Address"
                        value={profileAddress || address}
                        onChange={e => setProfileAddress(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">State / Province</Label>
                        <Input
                          placeholder="e.g. Karnataka"
                          value={state}
                          onChange={e => setState(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Country</Label>
                        <SearchableCombobox
                          options={COUNTRIES}
                          value={country}
                          onValueChange={setCountry}
                          placeholder="Country"
                          searchPlaceholder="Search country..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">PIN / Postal Code</Label>
                        <Input
                          placeholder="e.g. 560001"
                          value={postalCode}
                          onChange={e => setPostalCode(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Contact */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Globe2 className="size-3.5 text-primary" /> Contact Channels
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Official Phone Number</Label>
                      <Input
                        placeholder="+91 98765 00000"
                        value={profilePhone || phone}
                        onChange={e => setProfilePhone(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Contact Email Address</Label>
                      <Input
                        type="email"
                        placeholder="contact@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Branding (Light Logo, Dark Logo, Favicon) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Palette className="size-3.5 text-primary" /> Brand Assets & Logos
                  </div>

                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={lightLogoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload("logoLight", e)}
                  />
                  <input
                    type="file"
                    ref={darkLogoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload("logoDark", e)}
                  />
                  <input
                    type="file"
                    ref={faviconInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload("favicon", e)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Light Logo Box */}
                    <div className="border rounded-lg p-3 space-y-2 bg-card">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold">Light Theme Logo</Label>
                        <span className="text-[10px] text-muted-foreground">For light background</span>
                      </div>
                      <div className="h-20 rounded-md bg-white border border-dashed flex items-center justify-center p-2 relative overflow-hidden group">
                        {logoLight ? (
                          <img src={logoLight} alt="Light logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon className="size-5" />
                            <span className="text-[10px]">Default light logo active</span>
                          </div>
                        )}
                        {uploadingField === "logoLight" && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs flex-1 gap-1.5"
                          disabled={uploadingField === "logoLight"}
                          onClick={() => lightLogoInputRef.current?.click()}
                        >
                          <Upload className="size-3" /> {logoLight ? "Replace" : "Upload"}
                        </Button>
                        {logoLight && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => setLogoLight("")}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Dark Logo Box */}
                    <div className="border rounded-lg p-3 space-y-2 bg-card">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold">Dark Theme Logo</Label>
                        <span className="text-[10px] text-muted-foreground">For dark background</span>
                      </div>
                      <div className="h-20 rounded-md bg-slate-950 border border-dashed border-slate-800 flex items-center justify-center p-2 relative overflow-hidden group">
                        {logoDark ? (
                          <img src={logoDark} alt="Dark logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-500">
                            <ImageIcon className="size-5" />
                            <span className="text-[10px]">Default dark logo active</span>
                          </div>
                        )}
                        {uploadingField === "logoDark" && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs flex-1 gap-1.5"
                          disabled={uploadingField === "logoDark"}
                          onClick={() => darkLogoInputRef.current?.click()}
                        >
                          <Upload className="size-3" /> {logoDark ? "Replace" : "Upload"}
                        </Button>
                        {logoDark && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => setLogoDark("")}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favicon Box */}
                  <div className="border rounded-lg p-3 bg-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-md border border-dashed flex items-center justify-center p-1.5 bg-muted/40 relative">
                        {favicon ? (
                          <img src={favicon} alt="Favicon" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Sparkles className="size-4 text-muted-foreground" />
                        )}
                        {uploadingField === "favicon" && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold block">Browser Favicon</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Square PNG or ICO (32x32 recommended)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        disabled={uploadingField === "favicon"}
                        onClick={() => faviconInputRef.current?.click()}
                      >
                        <Upload className="size-3" /> {favicon ? "Replace" : "Upload Favicon"}
                      </Button>
                      {favicon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setFavicon("")}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(4)} className="font-bold gap-2">
                    Review & Launch <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review & Launch ──────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center py-2">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-black text-xl">Almost there! Review your setup</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Confirm the details below then click Launch to provision your workspace.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Organization Review */}
                  <div className="rounded-xl bg-muted/40 border p-3.5 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b flex items-center justify-between">
                      <span>Organization</span>
                      <span className="font-mono text-[10px] text-primary">{effectiveDisplayHost}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">Company Name:</span>
                      <span className="font-semibold text-right">{name || "—"}</span>

                      <span className="text-muted-foreground">Industry:</span>
                      <span className="font-semibold text-right truncate">{selectedIndustryItem?.label || industry}</span>

                      <span className="text-muted-foreground">Company Size:</span>
                      <span className="font-semibold text-right">
                        {COMPANY_SIZES.find(s => s.value === companySize)?.label || companySize}
                      </span>

                      {phone && (
                        <>
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-semibold text-right">{phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Regional Review */}
                  <div className="rounded-xl bg-muted/40 border p-3.5 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b">
                      Regional Preferences
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">Operating Currency:</span>
                      <span className="font-semibold text-right">{selectedCurrencyItem?.label || currency}</span>

                      <span className="text-muted-foreground">Base Timezone:</span>
                      <span className="font-semibold text-right truncate">{selectedTimezoneItem?.label || timezone}</span>

                      <span className="text-muted-foreground">Country:</span>
                      <span className="font-semibold text-right">{selectedCountryItem?.label || country}</span>
                    </div>
                  </div>

                  {/* Company Profile Review */}
                  <div className="rounded-xl bg-muted/40 border p-3.5 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b">
                      Company Profile & Identity
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">Legal Entity:</span>
                      <span className="font-semibold text-right">{profileName || name || "—"}</span>

                      {(profileAddress || address) && (
                        <>
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-semibold text-right truncate">{profileAddress || address}</span>
                        </>
                      )}

                      {state && (
                        <>
                          <span className="text-muted-foreground">State / Province:</span>
                          <span className="font-semibold text-right">{state}</span>
                        </>
                      )}

                      {postalCode && (
                        <>
                          <span className="text-muted-foreground">Postal Code:</span>
                          <span className="font-semibold text-right">{postalCode}</span>
                        </>
                      )}

                      {email && (
                        <>
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-semibold text-right">{email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Branding Review */}
                  <div className="rounded-xl bg-muted/40 border p-3.5 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b">
                      Branding Assets
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="border rounded p-2 bg-white">
                        <span className="text-[9px] text-slate-500 block mb-1">Light Logo</span>
                        <div className="h-8 flex items-center justify-center">
                          {logoLight ? (
                            <img src={logoLight} alt="Light logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400">Platform Default</span>
                          )}
                        </div>
                      </div>

                      <div className="border rounded p-2 bg-slate-950">
                        <span className="text-[9px] text-slate-400 block mb-1">Dark Logo</span>
                        <div className="h-8 flex items-center justify-center">
                          {logoDark ? (
                            <img src={logoDark} alt="Dark logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-500">Platform Default</span>
                          )}
                        </div>
                      </div>

                      <div className="border rounded p-2 bg-muted/50">
                        <span className="text-[9px] text-muted-foreground block mb-1">Favicon</span>
                        <div className="h-8 flex items-center justify-center">
                          {favicon ? (
                            <img src={favicon} alt="Favicon" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Platform Default</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" onClick={() => setStep(3)} disabled={loading} className="gap-2">
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={handleFinish} disabled={loading} className="font-bold gap-2 min-w-[180px]">
                    {loading ? (
                      <><Loader2 className="size-4 animate-spin" /> Provisioning…</>
                    ) : (
                      <><Rocket className="size-4" /> Launch Workspace</>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-[10px] text-muted-foreground">
          You can customize and manage all corporate settings anytime in <strong>Workspace Settings</strong>.
        </p>
      </div>
    </div>
  );
}
