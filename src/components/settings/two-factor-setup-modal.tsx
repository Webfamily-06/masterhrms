import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Download,
} from "lucide-react";

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TwoFactorSetupModal({
  open,
  onOpenChange,
  onSuccess,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<"intro" | "qr" | "verify" | "recovery">("intro");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  async function handleStartSetup() {
    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/totp/initiate", {});
      if (res.qrCode && res.secret) {
        setQrCode(res.qrCode);
        setSecret(res.secret);
        setBackupCodes(res.backupCodes || []);
        setStep("qr");
      } else {
        toast.error("Failed to generate authenticator configuration.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate 2FA setup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    const clean = totpCode.trim();
    if (clean.length < 6) {
      return toast.error("Please enter the complete 6-digit code.");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/totp/confirm", { token: clean });
      if (res.success) {
        toast.success("Two-Factor Authentication activated successfully!");
        setStep("recovery");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code. Please check your authenticator app.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  function handleCopyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    toast.success("Recovery codes copied to clipboard");
    setTimeout(() => setCopiedCodes(false), 2000);
  }

  function handleDownloadCodes() {
    const text = `MASTERHRMS TWO-FACTOR AUTHENTICATION RECOVERY CODES\n=================================================\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once:\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nKeep these codes in a safe, offline place.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masterhrms-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded.");
  }

  function handleFinish() {
    onOpenChange(false);
    setStep("intro");
    setTotpCode("");
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Two-Factor Authentication (TOTP)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Secure your MasterHRMS workspace account using an authenticator app.
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Smartphone className="size-4 text-primary" /> Supported Authenticator Apps:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
                <li>Google Authenticator (iOS / Android)</li>
                <li>Microsoft Authenticator (iOS / Android)</li>
                <li>Apple Keychain / Passwords (iOS / macOS)</li>
                <li>1Password, Bitwarden, or Authy</li>
              </ul>
            </div>

            <Button
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
              Begin Authenticator Setup
            </Button>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-4 py-2 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 inline-block mx-auto shadow-sm">
              <img src={qrCode} alt="TOTP QR Code" className="size-44 object-contain mx-auto" />
            </div>

            <div className="text-xs text-slate-500">
              Scan this QR code with your authenticator app.
            </div>

            {/* Manual Secret Key Fallback */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Manual Entry Key:
                </span>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {copiedSecret ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  {copiedSecret ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="text-xs font-mono font-bold text-slate-900 dark:text-white break-all select-all">
                {secret}
              </code>
            </div>

            <Button
              onClick={() => setStep("verify")}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Next: Verify 6-Digit Code →
            </Button>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={handleConfirmCode} className="space-y-4 py-2 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Enter the 6-digit code currently displayed in your authenticator app for <strong>MasterHRMS</strong>:
            </p>

            <Input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-2xl tracking-widest h-12 max-w-[200px] mx-auto border-2 focus:border-primary"
              required
              autoFocus
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("qr")}
                className="w-1/2"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="w-1/2 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify & Enable"}
              </Button>
            </div>
          </form>
        )}

        {step === "recovery" && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
              <ShieldCheck className="size-4 shrink-0 mt-0.5" />
              <div>
                <strong>Two-Factor Authentication is Active!</strong> Save these single-use recovery codes in case you lose access to your device.
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyCodes}
                className="w-1/2 text-xs gap-1.5"
              >
                {copiedCodes ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedCodes ? "Copied" : "Copy All"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadCodes}
                className="w-1/2 text-xs gap-1.5"
              >
                <Download className="size-3.5" /> Download (.txt)
              </Button>
            </div>

            <Button
              onClick={handleFinish}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold mt-2"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
