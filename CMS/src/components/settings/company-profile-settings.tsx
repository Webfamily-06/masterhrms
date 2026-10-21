import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  FileText,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { INDIAN_GST_STATES } from "@/components/invoices/invoice-creator-view";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
const CIN_REGEX = /^[LUlu]{1}[0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function CompanyProfileSettings() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: currentProfile } = useCurrentProfile(user);
  const tenantId = currentProfile?.tenant_id || currentProfile?.tenantId || currentProfile?.tenant?.id;

  // Query Authoritative Company Profile & GST Registrations
  const { data, isLoading, isError, refetch } = useQuery<{
    success: boolean;
    profile: any;
    gstRegistrations: any[];
    primaryGst: any;
  }>({
    queryKey: ["company-profile", tenantId],
    queryFn: async () => {
      const res: any = await api.get("/api/v1/company-profile");
      return res.data || res;
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const profile = data?.profile;
  const primaryGst = data?.primaryGst;

  // Observability & persistence state
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Section 1: Legal Identity
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [businessType, setBusinessType] = useState("pvt_ltd");
  const [pan, setPan] = useState("");
  const [tan, setTan] = useState("");
  const [cin, setCin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Section 2: Registered Office
  const [regAddressLine1, setRegAddressLine1] = useState("");
  const [regAddressLine2, setRegAddressLine2] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [regStateCode, setRegStateCode] = useState("29");
  const [regPostalCode, setRegPostalCode] = useState("");
  const [regCountry, setRegCountry] = useState("India");

  // Section 3: Billing Address
  const [sameAsRegistered, setSameAsRegistered] = useState(true);
  const [billAddressLine1, setBillAddressLine1] = useState("");
  const [billAddressLine2, setBillAddressLine2] = useState("");
  const [billCity, setBillCity] = useState("");
  const [billState, setBillState] = useState("");
  const [billStateCode, setBillStateCode] = useState("29");
  const [billPostalCode, setBillPostalCode] = useState("");
  const [billCountry, setBillCountry] = useState("India");

  // Section 4: GST Registration
  const [gstRegType, setGstRegType] = useState<string>("REGULAR");
  const [gstin, setGstin] = useState("");
  const [gstStateCode, setGstStateCode] = useState("29");
  const [gstStatus, setGstStatus] = useState<string>("ACTIVE");
  const [isPrimaryGst, setIsPrimaryGst] = useState(true);
  const [gstFrequency, setGstFrequency] = useState<string>("MONTHLY");
  const [eInvoicingEnabled, setEInvoicingEnabled] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (profile) {
      setLegalName(profile.legalName || currentProfile?.tenant?.name || "");
      setTradeName(profile.tradeName || "");
      setBusinessType(profile.businessType || "pvt_ltd");
      setPan(profile.pan || "");
      setTan(profile.tan || "");
      setCin(profile.cin || "");
      setEmail(profile.email || user?.email || "");
      setPhone(profile.phone || "");
      setWebsite(profile.website || "");

      // Registered Address
      const regLines = (profile.registeredAddress || "").split("\n");
      setRegAddressLine1(profile.registeredAddressLine1 || regLines[0] || "");
      setRegAddressLine2(profile.registeredAddressLine2 || regLines.slice(1).join(", ") || "");
      setRegCity(profile.registeredCity || "");
      setRegState(profile.registeredState || "");
      setRegStateCode(profile.registeredStateCode || "29");
      setRegPostalCode(profile.registeredPostalCode || "");
      setRegCountry(profile.registeredCountry || "India");

      // Billing Address
      setSameAsRegistered(profile.sameAsRegistered ?? true);
      const billLines = (profile.billingAddress || "").split("\n");
      setBillAddressLine1(profile.billingAddressLine1 || billLines[0] || "");
      setBillAddressLine2(profile.billingAddressLine2 || billLines.slice(1).join(", ") || "");
      setBillCity(profile.billingCity || "");
      setBillState(profile.billingState || "");
      setBillStateCode(profile.billingStateCode || "29");
      setBillPostalCode(profile.billingPostalCode || "");
      setBillCountry(profile.billingCountry || "India");

      if (profile.updatedAt) {
        setLastSavedAt(new Date(profile.updatedAt).toLocaleTimeString());
      }
    }

    if (primaryGst) {
      setGstin(primaryGst.gstin || "");
      setGstStateCode(primaryGst.stateCode || "29");
      setGstRegType(primaryGst.registrationType || "REGULAR");
      setGstStatus(primaryGst.status || "ACTIVE");
      setIsPrimaryGst(primaryGst.isPrimary ?? true);
      setGstFrequency(primaryGst.filingFrequency || "MONTHLY");
      setEInvoicingEnabled(primaryGst.eInvoicingEnabled ?? false);
    }
  }, [profile, primaryGst, currentProfile, user]);

  // Handle Registered State selection
  const handleRegStateChange = (code: string) => {
    setRegStateCode(code);
    const found = INDIAN_GST_STATES.find((s) => s.code === code);
    if (found) {
      setRegState(found.name);
    }
  };

  // Handle Billing State selection
  const handleBillStateChange = (code: string) => {
    setBillStateCode(code);
    const found = INDIAN_GST_STATES.find((s) => s.code === code);
    if (found) {
      setBillState(found.name);
    }
  };

  // Handle GSTIN changes with auto-extraction of State Code and PAN
  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);

    if (upper.length >= 2) {
      const code = upper.slice(0, 2);
      if (INDIAN_GST_STATES.some((s) => s.code === code)) {
        setGstStateCode(code);
      }
    }

    // Auto-extract PAN from characters 3-12 of GSTIN
    if (upper.length >= 12) {
      const extractedPan = upper.slice(2, 12);
      if (PAN_REGEX.test(extractedPan) && !pan) {
        setPan(extractedPan);
      }
    }
  };

  // Unified Mutation: Persist both CompanyProfile and GST Registration
  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus("saving");
      setSaveErrorMessage(null);

      // Validate required legal name
      if (!legalName.trim()) {
        throw new Error("Legal company name is required.");
      }
      if (!email.trim()) {
        throw new Error("Official corporate email is required.");
      }

      // 1. Compose address lines
      const regFull = [regAddressLine1.trim(), regAddressLine2.trim()].filter(Boolean).join("\n");
      const billFull = sameAsRegistered
        ? regFull
        : [billAddressLine1.trim(), billAddressLine2.trim()].filter(Boolean).join("\n");

      const profilePayload = {
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || null,
        businessType,
        cin: cin.trim() || null,
        pan: pan.trim().toUpperCase() || null,
        tan: tan.trim().toUpperCase() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        registeredAddress: regFull || null,
        registeredAddressLine1: regAddressLine1.trim() || null,
        registeredAddressLine2: regAddressLine2.trim() || null,
        registeredCity: regCity.trim() || null,
        registeredState: regState.trim() || null,
        registeredStateCode: regStateCode || null,
        registeredPostalCode: regPostalCode.trim() || null,
        registeredCountry: regCountry || "India",
        billingAddress: billFull || null,
        billingAddressLine1: sameAsRegistered ? regAddressLine1.trim() || null : billAddressLine1.trim() || null,
        billingAddressLine2: sameAsRegistered ? regAddressLine2.trim() || null : billAddressLine2.trim() || null,
        billingCity: sameAsRegistered ? regCity.trim() || null : billCity.trim() || null,
        billingState: sameAsRegistered ? regState.trim() || null : billState.trim() || null,
        billingStateCode: sameAsRegistered ? regStateCode : billStateCode || null,
        billingPostalCode: sameAsRegistered ? regPostalCode.trim() || null : billPostalCode.trim() || null,
        billingCountry: sameAsRegistered ? regCountry : billCountry || "India",
        sameAsRegistered,
      };

      await api.put("/api/v1/company-profile", profilePayload);

      // 2. Persist GST registration if entered
      if (gstin.trim()) {
        if (!GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
          throw new Error("Invalid 15-character GSTIN format (e.g. 29AABCT1234F1Z5).");
        }
        const gstPayload = {
          gstin: gstin.trim().toUpperCase(),
          legalName: legalName.trim(),
          tradeName: tradeName.trim() || null,
          stateCode: gstStateCode,
          registrationType: gstRegType,
          isPrimary: isPrimaryGst,
          status: gstStatus,
          filingFrequency: gstFrequency,
          eInvoicingEnabled,
        };
        await api.put("/api/v1/company-profile/gst", gstPayload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      qc.invalidateQueries({ queryKey: ["workspace", "settings"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setSaveStatus("success");
      setLastSavedAt(new Date().toLocaleTimeString());
      toast.success("Company profile saved");
    },
    onError: (err: any) => {
      setSaveStatus("error");
      const msg =
        err.response?.data?.details?.[0]?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to save company profile";
      setSaveErrorMessage(msg);
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card rounded-lg border">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Loading authoritative company records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center space-y-3 bg-destructive/5 rounded-lg border border-destructive/20">
        <AlertCircle className="size-6 text-destructive mx-auto" />
        <h3 className="text-sm font-semibold text-destructive">Failed to Load Company Profile</h3>
        <p className="text-xs text-muted-foreground">Unable to retrieve corporate data from the server.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
          Retry
        </Button>
      </div>
    );
  }

  // Address formatters for Document Identity Preview
  const previewRegisteredAddress = [
    regAddressLine1,
    regAddressLine2,
    regCity,
    [regState, regPostalCode].filter(Boolean).join(" "),
    regCountry,
  ].filter(Boolean).join(", ");

  const previewBillingAddress = sameAsRegistered
    ? previewRegisteredAddress
    : [
        billAddressLine1,
        billAddressLine2,
        billCity,
        [billState, billPostalCode].filter(Boolean).join(" "),
        billCountry,
      ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Header & Observability Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {legalName || currentProfile?.tenant?.name || "Company Profile & Statutory Identity"}
            </h2>
            {primaryGst?.gstin && (
              <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30 text-muted-foreground">
                GSTIN: {primaryGst.gstin}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative corporate master data for commercial invoices, salary slips, and legal filings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last Saved Indicator */}
          {lastSavedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span>Last saved: {lastSavedAt}</span>
            </div>
          )}

          {/* Restrained Save Button */}
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 font-medium h-8 text-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Profile
          </Button>
        </div>
      </div>

      {/* Save Error Alert if mutation fails */}
      {saveErrorMessage && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{saveErrorMessage}</span>
        </div>
      )}

      {/* SECTION 1: LEGAL IDENTITY */}
      <Card className="border shadow-none">
        <CardHeader className="py-3 px-4 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <FileText className="size-4 text-muted-foreground" />
            <span>1. Legal Identity</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Official registration credentials recorded with the Registrar of Companies and Ministry of Corporate Affairs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="legalName" className="text-xs font-medium">
                Legal Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="legalName"
                placeholder="e.g. Acme Technologies Private Limited"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tradeName" className="text-xs font-medium">
                Trade / Display Name
              </Label>
              <Input
                id="tradeName"
                placeholder="e.g. Acme Tech"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessType" className="text-xs font-medium">
                Constitution
              </Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger id="businessType" className="text-xs h-8">
                  <SelectValue placeholder="Select Constitution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pvt_ltd">Private Limited Company (Pvt Ltd)</SelectItem>
                  <SelectItem value="public_ltd">Public Limited Company (Ltd)</SelectItem>
                  <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                  <SelectItem value="partnership">Partnership Firm</SelectItem>
                  <SelectItem value="proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="individual">Individual Professional</SelectItem>
                  <SelectItem value="other">Other Legal Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pan" className="text-xs font-medium">
                Permanent Account Number (PAN)
              </Label>
              <Input
                id="pan"
                maxLength={10}
                placeholder="e.g. AABCT1234F"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="text-xs font-mono uppercase h-8"
              />
              {pan && !PAN_REGEX.test(pan) && (
                <p className="text-[11px] text-amber-600">Expected 10-character PAN format (e.g. AABCT1234F).</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tan" className="text-xs font-medium">
                Tax Deduction Account Number (TAN)
              </Label>
              <Input
                id="tan"
                maxLength={10}
                placeholder="e.g. BLRA12345F"
                value={tan}
                onChange={(e) => setTan(e.target.value.toUpperCase())}
                className="text-xs font-mono uppercase h-8"
              />
              {tan && !TAN_REGEX.test(tan) && (
                <p className="text-[11px] text-amber-600">Expected 10-character TAN format (e.g. BLRA12345F).</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cin" className="text-xs font-medium">
                Corporate Identification Number (CIN)
              </Label>
              <Input
                id="cin"
                maxLength={21}
                placeholder="e.g. U72200KA2020PTC123456"
                value={cin}
                onChange={(e) => setCin(e.target.value.toUpperCase())}
                className="text-xs font-mono uppercase h-8"
              />
              {cin && !CIN_REGEX.test(cin) && (
                <p className="text-[11px] text-amber-600">Expected 21-character CIN format (e.g. U72200KA2020PTC123456).</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Official Corporate Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. compliance@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium">
                Official Phone
              </Label>
              <Input
                id="phone"
                placeholder="e.g. +91 80 4123 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="website" className="text-xs font-medium">
                Official Website
              </Label>
              <Input
                id="website"
                placeholder="e.g. https://www.acme-corp.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: REGISTERED OFFICE */}
      <Card className="border shadow-none">
        <CardHeader className="py-3 px-4 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <MapPin className="size-4 text-muted-foreground" />
            <span>2. Registered Office</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Legal domicile address of the company as registered with the Ministry of Corporate Affairs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="regAddressLine1" className="text-xs font-medium">
                Address Line 1
              </Label>
              <Input
                id="regAddressLine1"
                placeholder="Premises, building, or unit number"
                value={regAddressLine1}
                onChange={(e) => setRegAddressLine1(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regAddressLine2" className="text-xs font-medium">
                Address Line 2
              </Label>
              <Input
                id="regAddressLine2"
                placeholder="Street name, locality, or landmark"
                value={regAddressLine2}
                onChange={(e) => setRegAddressLine2(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regCity" className="text-xs font-medium">
                City
              </Label>
              <Input
                id="regCity"
                placeholder="e.g. Bengaluru"
                value={regCity}
                onChange={(e) => setRegCity(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regStateCode" className="text-xs font-medium">
                State / Jurisdiction
              </Label>
              <Select value={regStateCode} onValueChange={handleRegStateChange}>
                <SelectTrigger id="regStateCode" className="text-xs h-8">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_GST_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regPostalCode" className="text-xs font-medium">
                Postal Code (PIN)
              </Label>
              <Input
                id="regPostalCode"
                maxLength={10}
                placeholder="e.g. 560066"
                value={regPostalCode}
                onChange={(e) => setRegPostalCode(e.target.value)}
                className="text-xs font-mono h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regCountry" className="text-xs font-medium">
                Country
              </Label>
              <Input
                id="regCountry"
                value={regCountry}
                onChange={(e) => setRegCountry(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: BILLING ADDRESS */}
      <Card className="border shadow-none">
        <CardHeader className="py-3 px-4 border-b bg-muted/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="size-4 text-muted-foreground" />
                <span>3. Billing Address</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Address displayed on outgoing commercial invoices when differing from registered office.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sameAsRegistered" className="text-xs font-normal cursor-pointer text-muted-foreground">
                Same as Registered Address
              </Label>
              <Switch
                id="sameAsRegistered"
                checked={sameAsRegistered}
                onCheckedChange={setSameAsRegistered}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {sameAsRegistered ? (
            <p className="text-xs text-muted-foreground italic py-1">
              Billing address is mirrored from the Registered Office address.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="billAddressLine1" className="text-xs font-medium">
                  Address Line 1
                </Label>
                <Input
                  id="billAddressLine1"
                  placeholder="Premises or suite number"
                  value={billAddressLine1}
                  onChange={(e) => setBillAddressLine1(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billAddressLine2" className="text-xs font-medium">
                  Address Line 2
                </Label>
                <Input
                  id="billAddressLine2"
                  placeholder="Street name or locality"
                  value={billAddressLine2}
                  onChange={(e) => setBillAddressLine2(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billCity" className="text-xs font-medium">
                  City
                </Label>
                <Input
                  id="billCity"
                  placeholder="e.g. Mumbai"
                  value={billCity}
                  onChange={(e) => setBillCity(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billStateCode" className="text-xs font-medium">
                  State / Jurisdiction
                </Label>
                <Select value={billStateCode} onValueChange={handleBillStateChange}>
                  <SelectTrigger id="billStateCode" className="text-xs h-8">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_GST_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billPostalCode" className="text-xs font-medium">
                  Postal Code (PIN)
                </Label>
                <Input
                  id="billPostalCode"
                  maxLength={10}
                  placeholder="e.g. 400001"
                  value={billPostalCode}
                  onChange={(e) => setBillPostalCode(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billCountry" className="text-xs font-medium">
                  Country
                </Label>
                <Input
                  id="billCountry"
                  value={billCountry}
                  onChange={(e) => setBillCountry(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: GST REGISTRATION */}
      <Card className="border shadow-none">
        <CardHeader className="py-3 px-4 border-b bg-muted/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="size-4 text-muted-foreground" />
                <span>4. GST Registration</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Authoritative GSTIN used for tax calculation, inter-state IGST vs intra-state CGST/SGST determination.
              </CardDescription>
            </div>
            {gstin && GSTIN_REGEX.test(gstin) && (
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                Valid GSTIN
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstin" className="text-xs font-medium">
                GSTIN (15-Character Identifier)
              </Label>
              <Input
                id="gstin"
                maxLength={15}
                placeholder="e.g. 29AABCT1234F1Z5"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="text-xs font-mono uppercase h-8"
              />
              {gstin && !GSTIN_REGEX.test(gstin) && (
                <p className="text-[11px] text-amber-600">Expected 15-character GSTIN (e.g. 29AABCT1234F1Z5).</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstRegType" className="text-xs font-medium">
                GST Registration Type
              </Label>
              <Select value={gstRegType} onValueChange={setGstRegType}>
                <SelectTrigger id="gstRegType" className="text-xs h-8">
                  <SelectValue placeholder="Scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">Regular Taxpayer</SelectItem>
                  <SelectItem value="COMPOSITION">Composition Scheme</SelectItem>
                  <SelectItem value="SEZ">Special Economic Zone (SEZ)</SelectItem>
                  <SelectItem value="ISD">Input Service Distributor (ISD)</SelectItem>
                  <SelectItem value="CASUAL">Casual Taxable Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstStateCode" className="text-xs font-medium">
                State / Jurisdiction
              </Label>
              <Select value={gstStateCode} onValueChange={setGstStateCode}>
                <SelectTrigger id="gstStateCode" className="text-xs h-8">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_GST_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gstin.length >= 2 && gstin.slice(0, 2) !== gstStateCode && (
                <p className="text-[11px] text-destructive">
                  State code ({gstStateCode}) must match first 2 digits of GSTIN ({gstin.slice(0, 2)}).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstStatus" className="text-xs font-medium">
                Registration Status
              </Label>
              <Select value={gstStatus} onValueChange={setGstStatus}>
                <SelectTrigger id="gstStatus" className="text-xs h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/5 md:col-span-2">
              <div className="space-y-0.5">
                <Label htmlFor="isPrimaryGst" className="text-xs font-medium cursor-pointer">
                  Primary Registration Indicator
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Use this GSTIN as default on commercial invoices and statutory tax filings.
                </p>
              </div>
              <Switch
                id="isPrimaryGst"
                checked={isPrimaryGst}
                onCheckedChange={setIsPrimaryGst}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5: DOCUMENT IDENTITY PREVIEW */}
      <Card className="border shadow-none bg-muted/5">
        <CardHeader className="py-3 px-4 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <FileText className="size-4 text-muted-foreground" />
            <span>5. Document Identity Preview</span>
          </CardTitle>
          <CardDescription className="text-xs">
            How this authoritative legal identity will appear on tenant-generated documents, payslips, and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="rounded-lg border bg-card p-4 space-y-4 max-w-2xl font-sans">
            {/* Document Header Representation */}
            <div className="border-b pb-3 flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  {legalName || "ENTERPRISE LEGAL NAME"}
                </h4>
                {tradeName && (
                  <p className="text-xs text-muted-foreground font-medium">
                    Trading as: {tradeName}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Constitution: {businessType.replace(/_/g, " ").toUpperCase()}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30 text-muted-foreground">
                Document Header Preview
              </Badge>
            </div>

            {/* Identifiers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border-b pb-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">CIN:</span>
                <span className="font-mono font-semibold">{cin || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">PAN:</span>
                <span className="font-mono font-semibold">{pan || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">TAN:</span>
                <span className="font-mono font-semibold">{tan || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">GSTIN:</span>
                <span className="font-mono font-semibold">{gstin || "—"}</span>
              </div>
            </div>

            {/* Addresses & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-[11px] block">Registered Office:</span>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  {previewRegisteredAddress || "Address not configured."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-[11px] block">Billing / Dispatch Office:</span>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  {previewBillingAddress || "Address not configured."}
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {email && <span>Email: {email}</span>}
              {phone && <span>Phone: {phone}</span>}
              {website && <span>Web: {website}</span>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="py-3 px-4 border-t bg-muted/10 flex justify-between items-center">
          <p className="text-[11px] text-muted-foreground">
            Authoritative source: <code className="font-mono">CompanyProfileService.resolveTenantCompanyIdentity</code>
          </p>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 font-medium h-8 text-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Profile &amp; GST
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
