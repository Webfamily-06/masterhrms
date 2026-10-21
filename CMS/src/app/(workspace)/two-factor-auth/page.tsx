'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  Download,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



interface TwoFactorStatus {
  enabled: boolean;
  twoFactorEnabled: boolean;
  remainingBackupCodes: number;
  backupCodesRemaining: number;
  twoFactorMethod?: string;
  confirmedAt?: string;
}

interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl?: string;
  qrCode?: string;
  backupCodes: string[];
}

function TwoFactorAuthPage() {
  const qc = useQueryClient();
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [disablePasswordInput, setDisablePasswordInput] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);

  // 1. Fetch active 2FA status
  const { data: status, isLoading: isStatusLoading } = useQuery<TwoFactorStatus>({
    queryKey: ["two-factor-status"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/two-factor-auth/status");
        const isEn = !!(res?.twoFactorEnabled ?? res?.enabled);
        const codesLeft = res?.backupCodesRemaining ?? res?.remainingBackupCodes ?? 0;
        return {
          enabled: isEn,
          twoFactorEnabled: isEn,
          remainingBackupCodes: codesLeft,
          backupCodesRemaining: codesLeft,
          twoFactorMethod: res?.twoFactorMethod,
          confirmedAt: res?.confirmedAt,
        };
      } catch {
        return {
          enabled: false,
          twoFactorEnabled: false,
          remainingBackupCodes: 0,
          backupCodesRemaining: 0,
        };
      }
    },
    staleTime: 10 * 1000,
  });

  // 2. Setup Mutation (Initiate setup, get QR code & secret)
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<TwoFactorSetupResponse>("/two-factor-auth/setup");
      return {
        ...res,
        qrCodeDataUrl: res.qrCodeDataUrl || res.qrCode || "",
      };
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate two-factor credentials");
    },
  });

  // 3. Verify & Enable Mutation
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      return await api.post("/two-factor-auth/confirm", { code: token });
    },
    onSuccess: () => {
      toast.success("Two-Factor Authentication activated successfully!");
      setTokenInput("");
      setupMutation.reset();
      qc.invalidateQueries({ queryKey: ["two-factor-status"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Invalid verification code. Please check your authenticator app.");
    },
  });

  // 4. Disable Mutation
  const disableMutation = useMutation({
    mutationFn: async (tokenOrPassword: string) => {
      return await api.post("/two-factor-auth/disable", { token: tokenOrPassword });
    },
    onSuccess: () => {
      toast.success("Two-Factor Authentication has been disabled.");
      setShowDisableModal(false);
      setDisablePasswordInput("");
      qc.invalidateQueries({ queryKey: ["two-factor-status"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable 2FA. Verify code or password.");
    },
  });

  // 5. Regenerate Backup Codes Mutation
  const regenCodesMutation = useMutation({
    mutationFn: async (token: string) => {
      return await api.post<{ backupCodes: string[] }>("/two-factor-auth/regenerate-backup-codes", { token });
    },
    onSuccess: (data) => {
      toast.success("New backup recovery codes generated.");
      qc.invalidateQueries({ queryKey: ["two-factor-status"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to regenerate backup codes.");
    },
  });

  const handleCopy = (text: string, isCode = false) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const handleDownloadCodes = (codes: string[]) => {
    const blob = new Blob([`MASTERHRMS RECOVERY CODES\n=======================\n\n${codes.join("\n")}\n\nKeep these codes stored securely. Each code is single-use.`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masterhrms-2fa-recovery-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded");
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Two-Factor Authentication (2FA)</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E9 Security Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enforce TOTP hardware or mobile authenticator verification (Google Authenticator, Authy, 1Password) on workspace logins.
          </p>
        </div>

        {status?.enabled ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1.5 px-3 gap-1.5 self-start sm:self-auto font-bold">
            <ShieldCheck className="size-4" /> Active & Enforced
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs py-1.5 px-3 gap-1.5 self-start sm:self-auto text-amber-600 bg-amber-500/10 border-amber-500/20 font-bold">
            <ShieldAlert className="size-4" /> Not Configured
          </Badge>
        )}
      </div>

      {isStatusLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-3">Verifying workspace security status...</p>
        </Card>
      ) : status?.enabled ? (
        /* State 1: 2FA is Active */
        <div className="space-y-6">
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="size-5 text-emerald-600" /> Account Protected with TOTP
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {status.remainingBackupCodes} Backup Codes Remaining
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Your workspace user account requires a six-digit TOTP verification code from your authenticator app on every new session login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border bg-card/80 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" /> Single-Use Backup Recovery Codes
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Backup codes allow you to regain access if you lose your phone or hardware security token. You currently have{" "}
                  <strong className="text-foreground">{status.remainingBackupCodes}</strong> active codes left.
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex flex-wrap gap-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDisableModal(true)}
              >
                <Unlock className="size-3.5" /> Disable Two-Factor Authentication
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        /* State 2: 2FA is Not Configured */
        <div className="space-y-6">
          {!setupMutation.data ? (
            <Card className="shadow-xs border-dashed border-2">
              <CardHeader className="text-center pb-4 pt-8">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto grid place-items-center mb-3">
                  <Lock className="size-7" />
                </div>
                <CardTitle className="text-xl font-black">Enable Two-Factor Authentication</CardTitle>
                <CardDescription className="text-xs max-w-md mx-auto mt-1.5 leading-relaxed">
                  Protect your enterprise workspace account against credential stuffing and brute-force attacks by pairing an authenticator app.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-md mx-auto text-xs space-y-3 pb-6">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Works with Google Authenticator, Microsoft Authenticator, Authy, or 1Password.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Includes 8 one-time cryptographic recovery codes in case you lose device access.</span>
                </div>
              </CardContent>
              <CardFooter className="justify-center pb-8 border-t pt-6">
                <Button
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                  className="font-bold gap-2 px-6"
                >
                  {setupMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Initializing Enrollment...
                    </>
                  ) : (
                    <>
                      <QrCode className="size-4" /> Start 2FA Setup Wizard
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            /* Setup Wizard in progress */
            <Card className="border shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <QrCode className="size-5 text-primary" /> Step 1: Scan QR Code & Save Backup Codes
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setupMutation.reset()}
                  >
                    Cancel
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Scan the QR code with your mobile authenticator app, or manually enter the Base32 setup key.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  {/* Left: QR Code Display */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl border bg-card text-center space-y-4">
                    {(setupMutation.data.qrCodeDataUrl || setupMutation.data.qrCode) ? (
                      <div className="p-3 bg-white rounded-xl shadow-xs border">
                        <img
                          src={setupMutation.data.qrCodeDataUrl || setupMutation.data.qrCode}
                          alt="2FA TOTP QR Code"
                          className="size-48 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="size-48 rounded-xl bg-muted grid place-items-center">
                        <QrCode className="size-16 text-muted-foreground" />
                      </div>
                    )}

                    <div className="space-y-1 w-full max-w-xs">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Manual Entry Secret Key
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          readOnly
                          value={setupMutation.data.secret}
                          className="font-mono text-xs text-center font-bold tracking-wider bg-muted/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(setupMutation.data!.secret)}
                          className="shrink-0 size-9"
                        >
                          {copiedSecret ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Backup Codes Display */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600" /> Important: Save Your Backup Codes
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        If you lose your device, these 8 recovery codes are your only way to regain access. Each code can be used once.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">One-Time Recovery Codes</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 font-semibold"
                            onClick={() => handleCopy(setupMutation.data!.backupCodes.join("\n"), true)}
                          >
                            {copiedCodes ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />} Copy All
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 font-semibold"
                            onClick={() => handleDownloadCodes(setupMutation.data!.backupCodes)}
                          >
                            <Download className="size-3" /> Download TXT
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        {setupMutation.data.backupCodes.map((code, idx) => (
                          <div key={idx} className="p-2 rounded bg-card border text-center font-bold tracking-wider">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Verification Input Form */}
                <div className="pt-6 border-t space-y-3">
                  <h3 className="font-bold text-sm text-foreground">Step 2: Enter 6-digit Code to Confirm Activation</h3>
                  <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ""))}
                      className="text-center font-mono text-lg font-bold tracking-[0.3em] h-11"
                    />
                    <Button
                      onClick={() => verifyMutation.mutate(tokenInput)}
                      disabled={tokenInput.length !== 6 || verifyMutation.isPending}
                      className="w-full sm:w-auto font-bold h-11 px-6 shrink-0"
                    >
                      {verifyMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" /> Activating...
                        </>
                      ) : (
                        "Verify & Enable 2FA"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* MODAL: DISABLE 2FA CONFIRMATION */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Disable Two-Factor Authentication?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disabling 2FA lowers your account security. To authorize this change, please enter a valid 6-digit code from your authenticator app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Current 6-Digit TOTP Token</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={disablePasswordInput}
              onChange={(e) => setDisablePasswordInput(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-lg font-bold tracking-widest"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowDisableModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={disablePasswordInput.length !== 6 || disableMutation.isPending}
              onClick={() => disableMutation.mutate(disablePasswordInput)}
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" /> Disabling...
                </>
              ) : (
                "Authorize & Disable 2FA"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default TwoFactorAuthPage;
