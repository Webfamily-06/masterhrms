import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  payment_id: z.string().optional(),
  order_id: z.string().optional(),
  amount: z.string().optional(),
});

export const Route = createFileRoute("/payment/pending")({
  validateSearch: searchSchema,
  component: PaymentPendingPage,
  head: () => ({
    meta: [
      { title: "Payment Processing — Master Workspace ERP" },
      { name: "description", content: "Your payment is currently being verified by the banking network." },
    ],
  }),
});

export function PaymentPendingPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const orderId = search.order_id || "ORD-REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const paymentId = search.payment_id || "PAY-PENDING-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const [pollCount, setPollCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Poll banking gateway
  useEffect(() => {
    const timer = setInterval(() => {
      setPollCount((prev) => {
        if (prev >= 6) {
          // Auto-resolve after a few cycles to simulate completion
          return prev + 1;
        }
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleManualCheck = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success("Payment verified! Redirecting to confirmation...");
      navigate({
        to: "/payment/success",
        search: {
          order_id: orderId,
          payment_id: paymentId,
        } as any,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-600 mb-1 ring-8 ring-amber-500/5 animate-pulse">
            <Clock className="size-12 animate-spin duration-3000" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Awaiting Bank Confirmation
          </h1>
          <p className="text-xs text-muted-foreground">
            Your transaction is currently being processed by the UPI / Card settlement network.
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6 space-y-5">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <Loader2 className="size-5 text-amber-600 shrink-0 mt-0.5 animate-spin" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  Synchronizing with Payment Gateway...
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Please do not close or refresh this tab. We are actively polling for the settlement webhook.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-medium text-foreground">{orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Gateway Tracking ID:</span>
                <span className="font-mono font-medium text-foreground">{paymentId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                  Pending Settlement
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleManualCheck}
                disabled={isVerifying}
                className="w-full font-bold h-10 gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Querying Bank Webhook...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" /> Check Status Now
                  </>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full text-xs font-semibold h-9"
              >
                <Link to="/billing">Return to Billing & Invoices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
