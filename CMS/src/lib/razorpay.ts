import { api } from "@/lib/api";
import { getActiveCurrencySettings } from "@/lib/currency";

export type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

export type RazorpayOptions = {
  amount: number; // Amount in active workspace currency
  currency?: string;
  name: string; // Product / Addon / Plan Name
  description: string;
  userName?: string;
  userEmail?: string;
  tenantId?: string;
  keyId?: string;
  orderId?: string;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({
  amount,
  currency,
  name,
  description,
  userName = "Valued Customer",
  userEmail = "customer@workspace.com",
  tenantId,
  keyId,
  orderId,
}: RazorpayOptions): Promise<RazorpayPaymentResponse> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error("Razorpay SDK failed to load. Check your internet connection.");
  }

  // Get Key ID and currency from user parameter or tenant config
  let razorpayKey = keyId;
  let gatewayCurrency = currency;

  if ((!razorpayKey || !gatewayCurrency) && tenantId) {
    try {
      const data = await api.get(`/payments/razorpay/config`);
      if (data?.config) {
        if (!razorpayKey && data.config.keyId) razorpayKey = data.config.keyId;
        if (!gatewayCurrency && data.config.currency) gatewayCurrency = data.config.currency;
      }
    } catch {
      try {
        const data = await api.get(`/cms/pages/system-razorpay-gateway-${tenantId}`);
        if (data?.content && data.content?.config?.keyId) {
          if (!razorpayKey) razorpayKey = data.content.config.keyId;
          if (!gatewayCurrency && data.content.config.currency) gatewayCurrency = data.content.config.currency;
        }
      } catch {
        // Fallback
      }
    }
  }

  const resolvedCurrency = (
    gatewayCurrency ||
    getActiveCurrencySettings().defaultCurrency ||
    "INR"
  ).toUpperCase();

  // Fallback test key ID if not configured
  if (!razorpayKey) {
    razorpayKey = "rzp_test_MasterHRMS2026";
  }

  const themeColor =
    (typeof window !== "undefined" && localStorage.getItem("master_hrms_primary_color")) ||
    "#6366f1";

  return new Promise((resolve, reject) => {
    let isHandled = false;

    const options = {
      key: razorpayKey,
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: resolvedCurrency,
      name: "Master HRMS",
      description: `${name} — ${description}`,
      order_id: orderId || undefined,
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: {
        color: themeColor,
      },
      handler: function (response: any) {
        isHandled = true;
        if (response && response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        } else {
          reject(new Error("Payment response is incomplete. Gateway did not return order, payment ID, or signature."));
        }
      },
      modal: {
        ondismiss: function () {
          if (!isHandled) {
            reject(new Error("Payment window was closed before completion. Activation rejected."));
          }
        },
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        isHandled = true;
        const errorMsg = resp.error?.description || "Payment failed or rejected by bank/gateway.";
        reject(new Error(errorMsg));
      });
      rzp.open();
    } catch (err: any) {
      reject(new Error(err.message || "Failed to initialize Razorpay checkout window."));
    }
  });
}
