import { supabase } from "@/integrations/supabase/client";

export type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

export type RazorpayOptions = {
  amount: number; // Amount in system currency (e.g. ₹499)
  name: string; // Product / Addon / Plan Name
  description: string;
  userName?: string;
  userEmail?: string;
  tenantId?: string;
  keyId?: string;
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
  name,
  description,
  userName = "Valued Customer",
  userEmail = "customer@workspace.com",
  tenantId,
  keyId,
}: RazorpayOptions): Promise<RazorpayPaymentResponse> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error("Razorpay SDK failed to load. Check your internet connection.");
  }

  // Get Key ID from user parameter or tenant config
  let razorpayKey = keyId;

  if (!razorpayKey && tenantId) {
    try {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", `system-razorpay-gateway-${tenantId}`)
        .maybeSingle();

      if (data?.content && (data.content as any).config?.keyId) {
        razorpayKey = (data.content as any).config.keyId;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback test key ID if not configured
  if (!razorpayKey) {
    razorpayKey = "rzp_test_MasterHRMS2026";
  }

  return new Promise((resolve, reject) => {
    let isHandled = false;

    const options = {
      key: razorpayKey,
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      name: "Master HRMS",
      description: `${name} — ${description}`,
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: {
        color: "#6366f1",
      },
      handler: function (response: any) {
        isHandled = true;
        if (response && response.razorpay_payment_id) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || `ord_${Date.now()}`,
            razorpay_signature: response.razorpay_signature || "",
          });
        } else {
          reject(new Error("Payment response is null or incomplete. Payment was not verified."));
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
