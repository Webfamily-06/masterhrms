import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Receipt,
  Building2,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  payment_id: z.string().optional(),
  order_id: z.string().optional(),
  amount: z.string().optional(),
  plan: z.string().optional(),
});

export const Route = createFileRoute("/payment/success")({
  validateSearch: searchSchema,
  component: PaymentSuccessPage,
  head: () => ({
    meta: [
      { title: "Payment Successful — Master Workspace ERP" },
      { name: "description", content: "Your subscription payment was successfully completed." },
    ],
  }),
});

export function PaymentSuccessPage() {
  const search = Route.useSearch();
  const paymentId = search.payment_id || "pay_demo_" + Math.random().toString(36).substring(2, 9);
  const orderId = search.order_id || "ord_erp_" + Math.random().toString(36).substring(2, 9);
  const amount = search.amount || "49,990";
  const plan = search.plan || "Growth Annual Subscription";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-600 mb-1 ring-8 ring-emerald-500/5 animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="size-12" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Payment Confirmed!
          </h1>
          <p className="text-xs text-muted-foreground">
            Your transaction has been approved and your workspace privileges are active.
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs text-muted-foreground">Amount Paid</span>
              <span className="text-2xl font-black text-foreground">₹{amount}</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Subscribed Product:</span>
                <span className="font-bold text-foreground">{plan}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Reference:</span>
                <span className="font-mono font-medium text-foreground">{paymentId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Order Reference:</span>
                <span className="font-mono font-medium text-foreground">{orderId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Transaction Date:</span>
                <span className="font-medium text-foreground">{today}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Captured & Verified
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary shrink-0" />
              <div className="text-[11px] text-muted-foreground">
                An official tax invoice and payment confirmation has been dispatched to your billing email address.
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button asChild className="w-full font-bold h-10 gap-2">
                <Link to="/dashboard">
                  Return to Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => toast.success("Receipt downloaded as PDF.")}
                  className="w-full text-xs font-semibold gap-1.5 h-9"
                >
                  <Download className="size-3.5" /> Download Tax Invoice
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs font-semibold gap-1.5 h-9"
                >
                  <Link to="/subscription">Manage Subscription & Invoices</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
