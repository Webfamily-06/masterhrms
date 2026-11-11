import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Award,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";

const searchSchema = z.object({
  code: z.string().optional().default(""),
});

export const Route = createFileRoute("/verify-certificate")({
  validateSearch: searchSchema,
  component: VerifyCertificatePage,
  head: () => ({
    meta: [
      { title: "Certificate Authenticity Verification — Master HRMS" },
      {
        name: "description",
        content:
          "Authoritative, cryptographic verification portal for MASTERHRMS corporate award certificates and employee recognition credentials.",
      },
      { property: "og:title", content: "Certificate Authenticity Verification — Master HRMS" },
      {
        property: "og:description",
        content:
          "Verify the cryptographic legitimacy, active validity, and recipient credentials of any corporate recognition award issued through MASTERHRMS.",
      },
    ],
  }),
});

interface VerificationResult {
  valid: boolean;
  status?: "ACTIVE" | "REVOKED";
  certificateNumber?: string;
  awardTitle?: string;
  awardCategory?: string;
  recipientName?: string;
  awardDate?: string;
  issuingOrganization?: string;
  issuedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  message?: string;
}

function VerifyCertificatePage() {
  const { code: initialCode } = Route.useSearch();
  const [codeInput, setCodeInput] = useState(initialCode || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const performVerification = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();
    if (!trimmed) return;

    setIsVerifying(true);
    setHasVerified(true);
    try {
      const res = await api.get(`/api/awards/certificates/verify/${encodeURIComponent(trimmed)}`);
      if (res.data?.success && res.data?.data) {
        setResult(res.data.data);
      } else {
        setResult(res.data || { valid: false, message: "Invalid verification response." });
      }
    } catch (err: any) {
      if (err.response?.data) {
        setResult(err.response.data);
      } else {
        setResult({
          valid: false,
          message: "Unable to verify certificate. Please check the code and ensure connection to the registry.",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.trim().length > 0) {
      performVerification(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(codeInput);
  };

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Official Certificate Registry"
        title="Certificate Authenticity Verification"
        subtitle="Verify the cryptographic legitimacy, active validity, and recipient credentials of any corporate recognition award issued through MASTERHRMS."
      />

      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Search Card */}
        <Card className="border-border/60 shadow-sm bg-card text-card-foreground mb-8">
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold">Search Certificate Registry</CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              Enter the unique Certificate Number (e.g. CERT-2026-...) or unguessable Verification Code from the award.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Enter Certificate Number or Verification Code..."
                  className="pl-9 h-11 text-sm font-mono uppercase bg-background"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isVerifying || !codeInput.trim()}
                className="h-11 px-6 gap-2 shrink-0 font-medium"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Verify Authenticity</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Verification Result Display */}
        {hasVerified && result && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {result.valid ? (
              <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-md overflow-hidden">
                <div className="bg-emerald-600 px-6 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    <span className="font-semibold text-sm tracking-wide">
                      AUTHENTIC & VALID CERTIFICATE
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs font-mono">
                    ACTIVE
                  </Badge>
                </div>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Recipient Headline */}
                  <div className="border-b pb-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                      Official Recipient
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {result.recipientName}
                    </h2>
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                      <Sparkles className="size-3.5" />
                      <span>Cryptographically validated against master tenant ledger</span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-background/80 p-3.5 rounded-lg border border-border/50 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Award className="size-3.5 text-primary" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Award Title</span>
                      </div>
                      <p className="font-medium text-foreground text-sm pl-5">{result.awardTitle}</p>
                    </div>

                    <div className="bg-background/80 p-3.5 rounded-lg border border-border/50 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 text-primary" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Issuing Organization</span>
                      </div>
                      <p className="font-medium text-foreground text-sm pl-5">{result.issuingOrganization}</p>
                    </div>

                    <div className="bg-background/80 p-3.5 rounded-lg border border-border/50 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5 text-primary" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Conferred Date</span>
                      </div>
                      <p className="font-medium text-foreground text-sm pl-5">{result.awardDate}</p>
                    </div>

                    <div className="bg-background/80 p-3.5 rounded-lg border border-border/50 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck className="size-3.5 text-primary" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Certificate Serial</span>
                      </div>
                      <p className="font-mono text-foreground text-sm pl-5">{result.certificateNumber}</p>
                    </div>
                  </div>

                  {result.issuedAt && (
                    <div className="text-center pt-2 text-[11px] text-muted-foreground font-mono">
                      Timestamp: {format(new Date(result.issuedAt), "PPPppp")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : result.status === "REVOKED" ? (
              <Card className="border-destructive/40 bg-destructive/5 shadow-md overflow-hidden">
                <div className="bg-destructive px-6 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-5" />
                    <span className="font-semibold text-sm tracking-wide">
                      CERTIFICATE OFFICIALLY REVOKED
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs font-mono">
                    REVOKED
                  </Badge>
                </div>
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                      Originally Issued To
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">
                      {result.recipientName}
                    </h2>
                    <p className="text-xs text-destructive font-medium">
                      This certificate has been revoked by {result.issuingOrganization} and is no longer valid.
                    </p>
                  </div>

                  <div className="bg-background/80 p-4 rounded-lg border border-border/50 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Award Title:</span>
                      <span className="font-medium text-foreground">{result.awardTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial Number:</span>
                      <span className="font-mono text-foreground">{result.certificateNumber}</span>
                    </div>
                    {result.revocationReason && (
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Revocation Reason:</span>
                        <span className="font-medium text-destructive">{result.revocationReason}</span>
                      </div>
                    )}
                    {result.revokedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revocation Date:</span>
                        <span className="font-mono text-foreground">
                          {format(new Date(result.revokedAt), "PPP")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 bg-muted/20 shadow-sm text-center py-12">
                <CardContent className="space-y-3">
                  <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <XCircle className="size-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No Certificate Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {result.message ||
                      "The identifier provided does not match any certificate in the MASTERHRMS verification registry. Please ensure you entered the exact number or code without typographical errors."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
