import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  RefreshCw,
  CreditCard,
  LifeBuoy,
  ArrowLeft,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  error_code: z.string().optional(),
  error_desc: z.string().optional(),
  order_id: z.string().optional(),
});

export const Route = createFileRoute("/payment/failed")({
  validateSearch: searchSchema,
  component: PaymentFailedPage,
  head: () => ({
    meta: [
      { title: "Payment Failed — Master Workspace ERP" },
      { name: "description", content: "The payment transaction could not be processed." },
    ],
  }),
});

export function PaymentFailedPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const errorCode = search.error_code || "CARD_DECLINED";
  const errorDesc =
    search.error_desc ||
    "Your issuing bank declined the transaction. This could be due to daily limits, 3D Secure verification timeout, or incorrect card credentials.";
  const orderId = search.order_id || "ORD-REF-FAIL-1049";

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-destructive/10 text-destructive mb-1 ring-8 ring-destructive/5 animate-in zoom-in-75 duration-300">
            <XCircle className="size-12" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Payment Unsuccessful
          </h1>
          <p className="text-xs text-muted-foreground">
            We were unable to process your payment. No funds were debited from your account.
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6 space-y-5">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="size-4" /> Decline Reason
                </span>
                <Badge variant="outline" className="font-mono text-[10px] text-destructive border-destructive/30">
                  {errorCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorDesc}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Order Reference:</span>
                <span className="font-mono font-medium text-foreground">{orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-destructive">Failed / Cancelled</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Suggested Resolution:</span>
                <span className="font-medium text-foreground">Verify OTP or use an alternate card / NetBanking</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => navigate({ to: "/subscription" })}
                className="w-full font-bold h-10 gap-2"
              >
                <RefreshCw className="size-4" /> Retry Payment Now
              </Button>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs font-semibold gap-1.5 h-9"
                >
                  <Link to="/subscription">
                    <CreditCard className="size-3.5" /> Change Payment Method
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs font-semibold gap-1.5 h-9"
                >
                  <Link to="/support">
                    <LifeBuoy className="size-3.5" /> Contact Support
                  </Link>
                </Button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/dashboard"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="size-3" /> Return to ERP Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
