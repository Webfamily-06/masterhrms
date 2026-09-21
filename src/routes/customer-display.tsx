import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { getSocketClient } from "@/lib/socket";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  QrCode,
  CircleCheck,
  Sparkles,
  Store,
  Wifi,
  Receipt,
  HeartHandshake,
} from "lucide-react";

export const Route = createFileRoute("/customer-display")({
  component: CustomerDisplayPage,
});

interface DisplayCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  gst_rate?: number;
  image?: string;
  unit?: string;
}

interface DisplayCartState {
  cart: DisplayCartItem[];
  subtotal: number;
  discountAmt: number;
  tax: { cgst: number; sgst: number; igst: number; total: number };
  total: number;
  customerName?: string;
  currency?: string;
  status?: "active" | "completed";
  receiptNo?: string;
}

export function CustomerDisplayPage() {
  const [displayState, setDisplayState] = useState<DisplayCartState>({
    cart: [],
    subtotal: 0,
    discountAmt: 0,
    tax: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    total: 0,
    customerName: "",
    currency: "INR",
    status: "active",
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [completedReceiptNo, setCompletedReceiptNo] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time synchronization via BroadcastChannel (local zero-latency) & WebSocket (network)
  useEffect(() => {
    // 1. BroadcastChannel API for dual monitors on the same PC
    const channel = new BroadcastChannel("stocky_pos_display");

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "CART_UPDATE") {
        setDisplayState({
          cart: data.cart || [],
          subtotal: data.subtotal || 0,
          discountAmt: data.discountAmt || 0,
          tax: data.tax || { cgst: 0, sgst: 0, igst: 0, total: 0 },
          total: data.total || 0,
          customerName: data.customerName || "",
          currency: data.currency || "INR",
          status: "active",
        });
        setIsCompleted(false);
      } else if (data.type === "SALE_COMPLETED") {
        setIsCompleted(true);
        setCompletedReceiptNo(data.receiptNo || "INV-0001");
        setTimeout(() => {
          setIsCompleted(false);
          setDisplayState({
            cart: [],
            subtotal: 0,
            discountAmt: 0,
            tax: { cgst: 0, sgst: 0, igst: 0, total: 0 },
            total: 0,
            customerName: "",
            currency: "INR",
            status: "active",
          });
        }, 6000);
      }
    };

    // 2. Socket.IO for network-synced secondary customer tablets / screens
    const socket = getSocketClient();

    function onSocketCartSync(payload: any) {
      if (payload) {
        setDisplayState({
          cart: payload.cart || [],
          subtotal: payload.subtotal || 0,
          discountAmt: payload.discountAmt || 0,
          tax: payload.tax || { cgst: 0, sgst: 0, igst: 0, total: 0 },
          total: payload.total || 0,
          customerName: payload.customerName || "",
          currency: payload.currency || "INR",
          status: "active",
        });
        setIsCompleted(false);
      }
    }

    function onSocketSaleCreated(payload: any) {
      setIsCompleted(true);
      setCompletedReceiptNo(payload.receiptNo || "INV-0001");
      setTimeout(() => {
        setIsCompleted(false);
        setDisplayState({
          cart: [],
          subtotal: 0,
          discountAmt: 0,
          tax: { cgst: 0, sgst: 0, igst: 0, total: 0 },
          total: 0,
          customerName: "",
          currency: "INR",
          status: "active",
        });
      }, 6000);
    }

    socket.on("pos:cart_sync", onSocketCartSync);
    socket.on("pos:sale_created", onSocketSaleCreated);

    return () => {
      channel.close();
      socket.off("pos:cart_sync", onSocketCartSync);
      socket.off("pos:sale_created", onSocketSaleCreated);
    };
  }, []);

  const formattedCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amt || 0);
  };

  const dynamicQrUrl = useMemo(() => {
    const amt = displayState.total || 0;
    const upiUri = encodeURIComponent(
      `upi://pay?pa=merchant@upi&pn=Retail%20Store&am=${amt.toFixed(2)}&cu=INR&tn=Bill%20Payment`
    );
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${upiUri}`;
  }, [displayState.total]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ── TOP NAV HEADER ── */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/80 px-6 flex items-center justify-between backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md">
            <Store className="size-5" />
          </div>
          <div>
            <div className="text-base font-black tracking-tight text-white flex items-center gap-2">
              Master Retail Store
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-bold py-0.5">
                <Wifi className="size-3" /> Live Synced
              </Badge>
            </div>
            <div className="text-xs text-slate-400">Customer Display Terminal</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {displayState.customerName && (
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Welcome</div>
              <div className="text-sm font-black text-orange-400">{displayState.customerName}</div>
            </div>
          )}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1 font-mono text-xs font-bold text-slate-300">
            {currentTime}
          </div>
        </div>
      </header>

      {/* ── MAIN DUAL-PANE VIEWPORT ── */}
      <main className="flex-1 p-6 grid lg:grid-cols-12 gap-6 overflow-hidden items-stretch">
        {/* LEFT COLUMN: SCANNED ITEMS (7 cols) */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 shrink-0">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <ShoppingCart className="size-4 text-orange-500" /> Scanned Items (
              {displayState.cart.reduce((s, i) => s + i.qty, 0)})
            </h2>
            <span className="text-xs text-slate-400">Updates live as items are scanned</span>
          </div>

          {displayState.cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="size-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 animate-pulse">
                <Sparkles className="size-10" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg font-black text-white">Ready for your order</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your scanned grocery and retail items will appear here instantly with live discounts and pricing.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
              {displayState.cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-4 hover:border-orange-500/40 transition-all shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="size-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0 flex items-center justify-center p-1">
                    <img
                      src={item.image || "/images/no-image.png"}
                      alt={item.name}
                      className="size-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/no-image.png";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span>{formattedCurrency(item.price)} each</span>
                      {item.gst_rate !== undefined && (
                        <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.2 rounded font-sans">
                          {item.gst_rate}% GST
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Line Total */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg inline-block font-mono">
                      Qty: {item.qty} {item.unit || "Pcs"}
                    </div>
                    <div className="text-base font-black font-mono text-white mt-1">
                      {formattedCurrency(item.price * item.qty)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: TOTALS & DYNAMIC SCAN & PAY QR (5 cols) */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
          {/* Calculation Summary */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-white pb-2 border-b border-slate-800">Payment Summary</h3>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between text-slate-400">
                <span>Total Items</span>
                <span className="font-mono text-slate-200">
                  {displayState.cart.reduce((s, i) => s + i.qty, 0)} Items
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{formattedCurrency(displayState.subtotal)}</span>
              </div>

              {displayState.discountAmt > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Special Discount</span>
                  <span className="font-mono">-{formattedCurrency(displayState.discountAmt)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Taxes (GST)</span>
                <span className="font-mono text-slate-200">
                  +{formattedCurrency(displayState.tax.cgst + displayState.tax.sgst + displayState.tax.igst)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-dashed border-slate-800 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-300">Grand Total</span>
                <span className="text-3xl font-black font-mono text-orange-400 tracking-tight">
                  {formattedCurrency(displayState.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Payment QR Code */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <QrCode className="size-4 text-orange-500" />
              <span>Instant Contactless Scan & Pay</span>
            </div>

            {displayState.total > 0 ? (
              <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200">
                <img src={dynamicQrUrl} alt="UPI Payment QR Code" className="size-36 object-contain" />
              </div>
            ) : (
              <div className="size-36 rounded-2xl bg-slate-800/80 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[11px] p-2">
                <QrCode className="size-8 mb-1 opacity-40" />
                <span>QR appears when items are added</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 font-medium">
              Scan with <strong className="text-slate-200">Google Pay, PhonePe, Paytm</strong>, or any UPI App
            </p>
          </div>

          {/* Footer note */}
          <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <HeartHandshake className="size-3.5 text-orange-500/80" />
            <span>Thank you for shopping with us!</span>
          </div>
        </section>
      </main>

      {/* ── CELEBRATION POPUP OVERLAY ON SALE CHECKOUT ── */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <Card className="max-w-md w-full bg-slate-900 border-slate-700 text-slate-100 p-8 text-center space-y-4 rounded-3xl shadow-2xl">
            <div className="size-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <CircleCheck className="size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Received!</h3>
              <p className="text-xs text-slate-400">Thank you for your business. Have a great day!</p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-3 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Receipt className="size-3.5 text-orange-500" /> Receipt #
              </span>
              <span className="font-bold text-orange-400">{completedReceiptNo}</span>
            </div>

            <div className="text-[11px] text-slate-500">Screen will reset automatically for next customer</div>
          </Card>
        </div>
      )}
    </div>
  );
}
