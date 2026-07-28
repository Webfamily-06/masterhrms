import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatSystemAmount } from "@/lib/currency";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { openPayPalCheckout } from "@/lib/paypal";
import { toast } from "sonner";
import {
  CreditCard, Landmark, Upload, CheckCircle2, XCircle, Loader2,
  ShieldCheck, FileText, ArrowRight, Building, Check, Image as ImageIcon,
} from "lucide-react";

export type PaymentCheckoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemType: "addon" | "plan";
  itemId: string;
  itemName: string;
  amount: number;
  description: string;
  onSuccess: (paymentDetails: { method: string; paymentId?: string }) => Promise<void>;
};

const BANK_DETAILS = {
  bankName: "HDFC Bank Ltd",
  accountName: "Master HRMS Enterprise Pvt Ltd",
  accountNo: "50200012345678",
  ifsc: "HDFC0001234",
  swiftCode: "HDFCINBB",
  upiId: "masterhrms@hdfcbank",
};

export function PaymentCheckoutModal({
  open,
  onOpenChange,
  title,
  itemType,
  itemId,
  itemName,
  amount,
  description,
  onSuccess,
}: PaymentCheckoutModalProps) {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "paypal" | "bank_transfer">("razorpay");
  const [isProcessing, setIsProcessing] = useState(false);

  // Bank Transfer Fields
  const [refNo, setRefNo] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => setProofPreview(String(evt.target?.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleProceedPayment() {
    if (!tenantId) return toast.error("Tenant session missing");

    setIsProcessing(true);

    try {
      // OPTION 1: RAZORPAY PAYMENT GATEWAY
      if (paymentMethod === "razorpay") {
        toast.info("Launching Razorpay Payment Gateway...");
        const razorpayResp = await openRazorpayCheckout({
          amount: amount,
          name: itemName,
          description: description,
          userName: profile?.full_name || user?.email || "Workspace Admin",
          userEmail: user?.email || "admin@workspace.com",
          tenantId: tenantId,
        });

        if (!razorpayResp || !razorpayResp.razorpay_payment_id) {
          throw new Error("Payment response is null or incomplete. Payment was not verified.");
        }

        await onSuccess({ method: "Razorpay", paymentId: razorpayResp.razorpay_payment_id });
        onOpenChange(false);
        return;
      }

      // OPTION 2: PAYPAL PAYMENT GATEWAY
      if (paymentMethod === "paypal") {
        toast.info("Launching PayPal Payment Gateway...");
        const paypalResp = await openPayPalCheckout({
          amount: amount,
          name: itemName,
          description: description,
          tenantId: tenantId,
          clientId: sysConfig?.paypalClientId,
        });

        if (!paypalResp || !paypalResp.paypal_order_id) {
          throw new Error("PayPal payment response is null or cancelled.");
        }

        await onSuccess({ method: "PayPal", paymentId: paypalResp.paypal_order_id });
        onOpenChange(false);
        return;
      }

      // OPTION 3: MANUAL BANK TRANSFER & PROOF SCREENSHOT UPLOAD
      if (paymentMethod === "bank_transfer") {
        if (!refNo.trim()) {
          throw new Error("Please enter your Bank Transaction / UTR / Ref Number.");
        }
        if (!proofFile && !proofPreview) {
          throw new Error("Please attach your payment receipt screenshot.");
        }

        let receiptUrl = proofPreview || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400";

        const monetizationSlug = "system-monetization-plans";
        const { data: existingData } = await supabase
          .from("cms_pages")
          .select("content")
          .eq("slug", monetizationSlug)
          .maybeSingle();

        const currentContent = (existingData?.content as any) || {};
        const existingTransfers = currentContent.bankTransfers || [];

        const newRequest = {
          id: `bt-${Date.now()}`,
          tenant_name: profile?.full_name || user?.email || "Workspace Tenant",
          amount: amount,
          reference_no: refNo.trim(),
          receipt_url: receiptUrl,
          status: "pending" as const,
          date: new Date().toISOString().slice(0, 10),
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
        };

        await supabase.from("cms_pages").upsert({
          slug: monetizationSlug,
          title: "Monetization Plans & Bank Transfers",
          content: { ...currentContent, bankTransfers: [newRequest, ...existingTransfers] },
          published: true,
        }, { onConflict: "slug" });

        qc.invalidateQueries({ queryKey: ["public-plans-list"] });

        toast.success(
          `⏳ Bank Transfer Request Submitted (Ref: ${refNo})! Super Admin will review your payment screenshot and activate ${itemName}.`,
          { duration: 7000 }
        );

        onOpenChange(false);
        setRefNo("");
        setProofFile(null);
        setProofPreview(null);
        return;
      }
    } catch (err: any) {
      toast.error(
        `❌ Payment Rejected / Failed: ${err.message || "Payment response was null or cancelled."}`,
        { duration: 6000 }
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose your preferred payment gateway to activate <strong className="text-foreground">{itemName}</strong> ({formatSystemAmount(amount, sysConfig?.currency)}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Item Summary Banner */}
          <div className="p-3 rounded-xl bg-secondary/40 border flex items-center justify-between">
            <div>
              <div className="font-extrabold text-sm">{itemName}</div>
              <div className="text-muted-foreground text-[11px]">{description}</div>
            </div>
            <div className="font-black text-lg text-primary font-mono shrink-0">
              {formatSystemAmount(amount, sysConfig?.currency)}
            </div>
          </div>

          {/* Payment Method Selector with Official Brand Logos */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Payment Method</Label>

            <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="space-y-2">
              {/* Razorpay */}
              <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${paymentMethod === "razorpay" ? "border-blue-600 bg-blue-500/5 shadow-xs ring-1 ring-blue-500/30" : "hover:bg-secondary/30"}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="razorpay" id="pm-razorpay" />
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-20 rounded-lg bg-white border p-1 grid place-items-center shrink-0 shadow-xs">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay Logo" className="h-full object-contain" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Razorpay Payment Gateway</div>
                      <div className="text-[10px] text-muted-foreground">UPI, Credit/Debit Cards, NetBanking, Wallets</div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white text-[9px]">Auto-Active</Badge>
              </label>

              {/* PayPal */}
              <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${paymentMethod === "paypal" ? "border-indigo-600 bg-indigo-500/5 shadow-xs ring-1 ring-indigo-500/30" : "hover:bg-secondary/30"}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="paypal" id="pm-paypal" />
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-20 rounded-lg bg-white border p-1 grid place-items-center shrink-0 shadow-xs">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal Logo" className="h-full object-contain" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">PayPal Global Checkout</div>
                      <div className="text-[10px] text-muted-foreground">PayPal Balance & International Credit Cards ($ USD)</div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-indigo-600 text-white text-[9px]">Global Instant</Badge>
              </label>

              {/* Manual Bank Transfer */}
              <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${paymentMethod === "bank_transfer" ? "border-emerald-600 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/30" : "hover:bg-secondary/30"}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="bank_transfer" id="pm-bank" />
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-20 rounded-lg bg-white border p-1 flex items-center justify-center gap-1 shrink-0 shadow-xs">
                      <Landmark className="size-3.5 text-emerald-600" />
                      <span className="font-black text-[10px] text-emerald-700 font-mono">UPI/BANK</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs">Manual Bank Transfer + Receipt Upload</div>
                      <div className="text-[10px] text-muted-foreground">Direct Bank / UPI transfer with screenshot verification</div>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px]">Admin Verify</Badge>
              </label>
            </RadioGroup>
          </div>

          {/* Manual Bank Transfer Detailed Panel */}
          {paymentMethod === "bank_transfer" && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 border-b border-emerald-500/20 pb-2">
                <Building className="size-4" /> Official Bank Account Details & Transfer Instructions
              </div>

              {sysConfig?.bankTransferDetails ? (
                <div className="p-2.5 rounded-lg bg-background border font-mono text-[11px] whitespace-pre-line leading-relaxed text-foreground">
                  {sysConfig.bankTransferDetails}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div><span className="text-muted-foreground">Bank:</span> <strong className="text-foreground">{BANK_DETAILS.bankName}</strong></div>
                  <div><span className="text-muted-foreground">A/C Name:</span> <strong className="text-foreground">{BANK_DETAILS.accountName}</strong></div>
                  <div><span className="text-muted-foreground">A/C No:</span> <strong className="text-foreground">{BANK_DETAILS.accountNo}</strong></div>
                  <div><span className="text-muted-foreground">IFSC:</span> <strong className="text-foreground">{BANK_DETAILS.ifsc}</strong></div>
                  <div className="col-span-2"><span className="text-muted-foreground">UPI ID:</span> <strong className="text-foreground text-emerald-600">{BANK_DETAILS.upiId}</strong></div>
                </div>
              )}

              <div className="space-y-2 border-t border-emerald-500/20 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Transaction / UTR / Reference No. *</Label>
                  <Input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="e.g. UTR1234567890"
                    className="text-xs font-mono bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Attach Payment Screenshot / Receipt *</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {proofPreview ? (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                      <img src={proofPreview} alt="Receipt preview" className="size-10 object-cover rounded-md border shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate">{proofFile?.name || "Receipt screenshot"}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">Ready to submit</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-xs font-bold gap-2 h-9 bg-background"
                    >
                      <Upload className="size-3.5 text-emerald-600" /> Upload Receipt Screenshot (.jpg, .png)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleProceedPayment}
            disabled={isProcessing}
            className="font-bold gap-2 bg-primary text-primary-foreground"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {paymentMethod === "bank_transfer"
              ? "Submit Receipt for Approval"
              : `Pay ${formatSystemAmount(amount, sysConfig?.currency)} via ${paymentMethod === "paypal" ? "PayPal" : "Razorpay"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
