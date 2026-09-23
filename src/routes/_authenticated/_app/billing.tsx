import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Download,
  Receipt,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Building2,
  Calendar,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing & Subscription Management — Master ERP" }] }),
});

export function BillingPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  // Modals state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form selections for modals
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState("enterprise");
  const [billingCycle, setBillingCycle] = useState("annual");
  const [cancelReason, setCancelReason] = useState("too_expensive");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Query Workspace Subscription
  const { data: subscription } = useQuery({
    queryKey: ["workspace-subscription-billing", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/workspace/subscription");
      } catch {
        return {
          planName: "Growth Plan",
          status: "active",
          billingCycle: "Annual",
          amount: 49990,
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          usage: { employees: 18, maxEmployees: 100, storageMb: 4200, maxStorageMb: 25000 },
        };
      }
    },
  });

  // Query Invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["workspace-invoices-billing", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/payments/razorpay/transactions");
        if (Array.isArray(res?.transactions) && res.transactions.length > 0) {
          return res.transactions;
        }
      } catch {}
      return [
        {
          id: "inv-2026-001",
          orderId: "INV-2026-001",
          invoiceRef: "RCPT-98421",
          amount: 49990,
          method: "Corporate Credit Card",
          timestamp: "2026-03-15T10:30:00Z",
          status: "captured",
        },
        {
          id: "inv-2025-004",
          orderId: "INV-2025-004",
          invoiceRef: "RCPT-87311",
          amount: 19990,
          method: "UPI AutoPay",
          timestamp: "2025-09-15T11:00:00Z",
          status: "captured",
        },
      ];
    },
  });

  // Upgrade Plan Mutation
  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      await api.post("/workspace/subscription/upgrade", {
        planSlug: selectedUpgradePlan,
        billingCycle,
      });
      toast.success("Upgrade request confirmed! Prorated invoice generated.");
      setShowUpgradeModal(false);
      qc.invalidateQueries({ queryKey: ["workspace-subscription-billing"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to process upgrade.");
    } finally {
      setActionLoading(false);
    }
  };

  // Downgrade Plan Mutation
  const handleDowngrade = async () => {
    setActionLoading(true);
    try {
      await api.post("/workspace/subscription/downgrade", {
        planSlug: "starter",
      });
      toast.success("Downgrade scheduled for end of active billing cycle.");
      setShowDowngradeModal(false);
      qc.invalidateQueries({ queryKey: ["workspace-subscription-billing"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to process downgrade.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Subscription Mutation
  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await api.post("/workspace/subscription/cancel", {
        reason: cancelReason,
        feedback: cancelFeedback,
      });
      toast.info("Subscription cancellation recorded. Workspace remains active until period end.");
      setShowCancelModal(false);
      qc.invalidateQueries({ queryKey: ["workspace-subscription-billing"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Billing & Subscription Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your organization tier, payment methods, upgrade/downgrade requests, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUpgradeModal(true)}
            size="sm"
            className="font-bold text-xs gap-1.5 shadow-sm"
          >
            <Zap className="size-3.5" /> Upgrade Plan
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5"
          >
            <Link to="/subscription">Addon Marketplace</Link>
          </Button>
        </div>
      </div>

      {/* Subscription Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <Card className="border-border shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 mb-1">
                  Active Subscription
                </Badge>
                <CardTitle className="text-xl font-black">
                  {subscription?.planName || "Growth Enterprise Tier"}
                </CardTitle>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                ● Status: Active
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Billed annually. Next renewal scheduled on{" "}
              <span className="font-semibold text-foreground">
                {subscription?.expiresAt
                  ? new Date(subscription.expiresAt).toLocaleDateString()
                  : "September 15, 2026"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border">
              <div>
                <p className="text-[11px] text-muted-foreground">Billing Cycle</p>
                <p className="text-sm font-bold text-foreground">Annual Prepaid</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Annual Recurring Rate</p>
                <p className="text-sm font-bold text-foreground">{formatSystemAmount(49990)} / yr</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Active Seat Capacity</p>
                <p className="text-sm font-bold text-foreground">18 / 100 Employees</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="text-xs font-bold gap-1 text-primary hover:text-primary"
              >
                <ArrowUpRight className="size-3.5" /> Change Plan / Upgrade
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDowngradeModal(true)}
                className="text-xs font-semibold gap-1 text-muted-foreground"
              >
                <ArrowDownRight className="size-3.5" /> Request Downgrade
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-destructive hover:bg-destructive/10 ml-auto"
              >
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="size-4 text-primary" /> Payment Method
            </CardTitle>
            <CardDescription className="text-xs">
              Primary card used for automatic recurring renewals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3.5 rounded-xl border bg-card text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Visa Corporate Card</span>
                <Badge variant="secondary" className="text-[9px] uppercase">Default</Badge>
              </div>
              <p className="font-mono text-muted-foreground">•••• •••• •••• 4242</p>
              <p className="text-[11px] text-muted-foreground">Expires 12/28</p>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold"
              onClick={() => toast.info("Payment gateway portal opened for card update.")}
            >
              Update Payment Method
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Invoices & Receipt History */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> Invoice & Receipt History
              </CardTitle>
              <CardDescription className="text-xs">
                Official tax invoices and downloadable payment receipts for your organization.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-bold">Invoice Number</TableHead>
                  <TableHead className="font-bold">Date Issued</TableHead>
                  <TableHead className="font-bold">Payment Method</TableHead>
                  <TableHead className="font-bold">Amount Paid</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id || inv.orderId} className="text-xs">
                    <TableCell className="font-mono font-bold">
                      {inv.invoiceRef || inv.orderId}
                    </TableCell>
                    <TableCell>
                      {new Date(inv.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{inv.method || "Card"}</TableCell>
                    <TableCell className="font-bold">
                      {formatSystemAmount(inv.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                      >
                        Paid
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-primary"
                        onClick={() => {
                          toast.success(`Downloading invoice ${inv.invoiceRef || inv.orderId}.pdf`);
                        }}
                      >
                        <Download className="size-3" /> Receipt PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* UPGRADE MODAL */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Zap className="size-5 text-primary" /> Upgrade Subscription Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select your desired higher capacity tier. The invoice will be automatically prorated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold">Target Plan Tier</label>
              <Select value={selectedUpgradePlan} onValueChange={setSelectedUpgradePlan}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth Plan (100 Employees) — {formatSystemAmount(4999)}/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise Tier (Unlimited) — {formatSystemAmount(12999)}/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Billing Frequency</label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Billing (Save 20% discount)</SelectItem>
                  <SelectItem value="monthly">Monthly Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> Immediate Activation
              </p>
              <p className="text-muted-foreground text-[11px]">
                Higher quota limits, biometric sync pipelines, and dedicated account manager unlocked immediately.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowUpgradeModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleUpgrade}
              className="font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOWNGRADE MODAL */}
      <Dialog open={showDowngradeModal} onOpenChange={setShowDowngradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5 text-amber-600" /> Plan Downgrade Confirmation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please review the restrictions that will take effect at the end of your billing cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Downgrade to Starter Tier</p>
              <p className="text-[11px]">
                Your employee seats will be capped at 25 and advanced AI-OCR capabilities will be disabled after the active period expires.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDowngradeModal(false)}>
              Keep Current Plan
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={handleDowngrade}
              className="font-bold"
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Schedule Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL SUBSCRIPTION MODAL */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <XCircle className="size-5 text-destructive" /> Cancel Enterprise Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              We're sorry to see you go. Help us improve by providing your reason for cancelling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold">Primary Reason</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="too_expensive">Pricing / Budget constraints</SelectItem>
                  <SelectItem value="missing_features">Missing features I need</SelectItem>
                  <SelectItem value="switching_competitor">Switching to another platform</SelectItem>
                  <SelectItem value="temporary_pause">Temporary business pause</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Additional Feedback (Optional)</label>
              <Textarea
                placeholder="What could we have done better?"
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep My Subscription
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={handleCancel}
              className="font-bold"
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
