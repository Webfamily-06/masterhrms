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
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

const searchSchema = z.object({
  code: z.string().optional().default(""),
});

export const Route = createFileRoute("/verify-certificate")({
  validateSearch: searchSchema,
  component: VerifyCertificatePage,
  head: () => ({
    meta: [
      { title: "Verify Award Certificate — Master HRMS" },
      { name: "description", content: "Authoritative, cryptographic verification portal for MASTERHRMS corporate award certificates." },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6 pt-6">
        {/* Navigation / Header Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-sm">
              <Award className="size-5" />
            </div>
            <div>
              <span className="font-semibold text-foreground text-sm tracking-tight block">
                MASTERHRMS
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono block">
                Official Certificate Registry
              </span>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground">
              <ArrowLeft className="size-3.5" />
              <span>Back to App</span>
            </Button>
          </Link>
        </div>

        {/* Search Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold">Certificate Authenticity Verification</CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              Verify the cryptographic legitimacy, active validity, and recipient credentials of any corporate recognition award issued through MASTERHRMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Enter Verification Code (e.g., VERIFY-4A9B...)"
                  className="pl-9 h-10 text-sm font-mono uppercase"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isVerifying || !codeInput.trim()}
                className="h-10 px-5 gap-2 shrink-0 font-medium"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Verify Code</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Verification Results View */}
        {hasVerified && !isVerifying && result && (
          <div>
            {result.valid && result.status === "ACTIVE" ? (
              <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-md overflow-hidden">
                <div className="h-1.5 bg-emerald-500 w-full" />
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-[10px] uppercase">
                          Authoritative • Verified Active
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          #{result.certificateNumber}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        Authentic Recognition Certificate
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        This electronic certificate has been verified directly against the MASTERHRMS authoritative PostgreSQL ledger.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-500/20">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <User className="size-3.5 text-muted-foreground/70" /> Recipient
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {result.recipientName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Award className="size-3.5 text-muted-foreground/70" /> Award Honor
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {result.awardTitle}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-muted-foreground/70" /> Issuing Organization
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {result.issuingOrganization}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3.5 text-muted-foreground/70" /> Conferral Date
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {result.awardDate
                          ? format(new Date(result.awardDate), "MMMM dd, yyyy")
                          : "Verified"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row justify-between items-center text-[11px] text-muted-foreground gap-2">
                    <span className="font-mono">
                      Verification Reference: {codeInput.toUpperCase()}
                    </span>
                    <span>Zero PII Exposure Standard</span>
                  </div>
                </CardContent>
              </Card>
            ) : result.status === "REVOKED" ? (
              <Card className="border-destructive/40 bg-destructive/5 shadow-md overflow-hidden">
                <div className="h-1.5 bg-destructive w-full" />
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                      <ShieldAlert className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                          Certificate Revoked
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          #{result.certificateNumber}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        Certificate No Longer Valid
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        This certificate was officially revoked and rescinded by the issuing organization.
                      </p>
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-md p-3.5 border border-destructive/20 space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium">Award Title: </span>
                      <span className="font-semibold text-foreground">{result.awardTitle}</span>
                    </div>
                    {result.recipientName && (
                      <div>
                        <span className="text-muted-foreground font-medium">Recipient: </span>
                        <span className="font-semibold text-foreground">{result.recipientName}</span>
                      </div>
                    )}
                    {result.revocationReason && (
                      <div>
                        <span className="text-destructive font-medium">Official Revocation Reason: </span>
                        <span className="text-foreground italic">"{result.revocationReason}"</span>
                      </div>
                    )}
                    {result.revokedAt && (
                      <div className="text-[11px] text-muted-foreground">
                        Revoked on: {format(new Date(result.revokedAt), "MMMM dd, yyyy")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 bg-muted/20 shadow-sm text-center py-8">
                <CardContent className="space-y-3">
                  <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <XCircle className="size-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No Certificate Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {result.message ||
                      "The verification code provided does not match any record in the MASTERHRMS verification registry. Please ensure you entered the exact code without typographical errors."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border/40 mt-8">
        MASTERHRMS Trust & Verification Engine • Authoritative Electronic Credentials • Zero Data Leakage Architecture
      </footer>
    </div>
  );
}

