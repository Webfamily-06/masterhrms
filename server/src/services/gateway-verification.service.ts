import crypto from "crypto";

export interface GatewayVerificationResult {
  verified: boolean;
  status: "captured" | "failed" | "pending" | "unavailable";
  orderId?: string | null;
  paymentId?: string | null;
  amount?: number;
  currency?: string;
  error?: string;
  code?: string;
  rawPayload?: any;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. RAZORPAY SERVER-SIDE VERIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function verifyRazorpayPayment(params: {
  orderId: string;
  paymentId: string;
  signature?: string;
  expectedAmountPaise?: number;
  expectedCurrency?: string;
}): Promise<GatewayVerificationResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return {
      verified: false,
      status: "unavailable",
      code: "PAYMENT_VERIFICATION_UNAVAILABLE",
      error: "Razorpay signature verification secret (RAZORPAY_KEY_SECRET) is not configured on this server.",
    };
  }

  if (!params.signature) {
    return {
      verified: false,
      status: "failed",
      code: "SIGNATURE_REQUIRED",
      error: "Razorpay payment signature is required for cryptographic verification.",
    };
  }

  // 1. Cryptographic HMAC-SHA256 signature verification with timing-safe comparison
  const generated = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const sigBuf = Buffer.from(params.signature);
  const genBuf = Buffer.from(generated);
  const isSigValid = sigBuf.length === genBuf.length && crypto.timingSafeEqual(sigBuf, genBuf);

  if (!isSigValid) {
    return {
      verified: false,
      status: "failed",
      code: "INVALID_SIGNATURE",
      error: "Invalid Razorpay payment cryptographic signature.",
    };
  }

  // 2. Authoritative REST API Verification if KEY_ID is configured
  if (keyId && !keyId.includes("test_MasterHRMSKey")) {
    try {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const resp = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}`, {
        method: "GET",
        headers: { Authorization: authHeader },
      });

      if (resp.ok) {
        const paymentData: any = await resp.json();
        const gatewayAmount = Number(paymentData.amount);
        const gatewayCurrency = String(paymentData.currency || "INR").toUpperCase();
        const gatewayStatus = String(paymentData.status || "").toLowerCase();

        if (gatewayStatus !== "captured" && gatewayStatus !== "authorized") {
          return {
            verified: false,
            status: "failed",
            code: "PAYMENT_NOT_CAPTURED",
            error: `Razorpay payment status is '${gatewayStatus}', expected 'captured'.`,
            rawPayload: paymentData,
          };
        }

        if (params.expectedAmountPaise && gatewayAmount !== params.expectedAmountPaise) {
          return {
            verified: false,
            status: "failed",
            code: "VERIFICATION_MISMATCH",
            error: `Payment amount mismatch: expected ${params.expectedAmountPaise} paise, gateway received ${gatewayAmount} paise.`,
            rawPayload: paymentData,
          };
        }

        if (params.expectedCurrency && gatewayCurrency !== params.expectedCurrency.toUpperCase()) {
          return {
            verified: false,
            status: "failed",
            code: "VERIFICATION_MISMATCH",
            error: `Currency mismatch: expected ${params.expectedCurrency}, gateway received ${gatewayCurrency}.`,
            rawPayload: paymentData,
          };
        }

        return {
          verified: true,
          status: "captured",
          orderId: paymentData.order_id || params.orderId,
          paymentId: paymentData.id || params.paymentId,
          amount: gatewayAmount / 100,
          currency: gatewayCurrency,
          rawPayload: paymentData,
        };
      }
    } catch (apiErr: any) {
      console.warn("[Razorpay REST Verification] API query warning:", apiErr?.message);
      // Fallback to valid cryptographic signature if network request times out
    }
  }

  return {
    verified: true,
    status: "captured",
    orderId: params.orderId,
    paymentId: params.paymentId,
    rawPayload: { signatureVerified: true },
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. PAYPAL SERVER-SIDE CAPTURE & VERIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function captureAndVerifyPayPalOrder(params: {
  orderId: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}): Promise<GatewayVerificationResult> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";

  if (!clientId || !clientSecret || clientId.includes("xxxx") || clientSecret.includes("xxxx")) {
    return {
      verified: false,
      status: "unavailable",
      code: "PAYMENT_VERIFICATION_UNAVAILABLE",
      error: "PayPal server-side credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) are not configured.",
    };
  }

  const baseUrl = mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  try {
    // 1. Obtain OAuth 2.0 Access Token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResp = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return {
        verified: false,
        status: "unavailable",
        code: "PAYPAL_AUTH_FAILED",
        error: `Failed to authenticate with PayPal API: ${errText}`,
      };
    }

    const tokenData: any = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // 2. Capture the Order on PayPal
    const captureResp = await fetch(`${baseUrl}/v2/checkout/orders/${params.orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    let orderData: any;
    if (captureResp.status === 422) {
      // Order may have already been captured; fetch order details
      const getResp = await fetch(`${baseUrl}/v2/checkout/orders/${params.orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (getResp.ok) {
        orderData = await getResp.json();
      } else {
        return {
          verified: false,
          status: "failed",
          code: "PAYPAL_CAPTURE_FAILED",
          error: "PayPal order could not be captured or retrieved.",
        };
      }
    } else if (!captureResp.ok) {
      const errJson: any = await captureResp.json().catch(() => ({}));
      return {
        verified: false,
        status: "failed",
        code: "PAYPAL_CAPTURE_FAILED",
        error: errJson.message || `PayPal capture failed with HTTP ${captureResp.status}`,
        rawPayload: errJson,
      };
    } else {
      orderData = await captureResp.json();
    }

    const orderStatus = orderData.status; // COMPLETED
    if (orderStatus !== "COMPLETED") {
      return {
        verified: false,
        status: "pending",
        code: "PAYMENT_NOT_COMPLETED",
        error: `PayPal order status is '${orderStatus}', not 'COMPLETED'.`,
        rawPayload: orderData,
      };
    }

    // 3. Extract capture details
    const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedAmount = parseFloat(capture?.amount?.value || "0");
    const capturedCurrency = capture?.amount?.currency_code || "USD";
    const captureId = capture?.id || params.orderId;

    // 4. Verify amount & currency match internal invoice
    if (params.expectedAmount !== undefined && Math.abs(capturedAmount - params.expectedAmount) > 0.01) {
      return {
        verified: false,
        status: "failed",
        code: "VERIFICATION_MISMATCH",
        error: `Amount mismatch: invoice expected ${params.expectedAmount}, PayPal captured ${capturedAmount}.`,
        rawPayload: orderData,
      };
    }

    if (params.expectedCurrency && capturedCurrency.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
      return {
        verified: false,
        status: "failed",
        code: "VERIFICATION_MISMATCH",
        error: `Currency mismatch: invoice expected ${params.expectedCurrency}, PayPal received ${capturedCurrency}.`,
        rawPayload: orderData,
      };
    }

    return {
      verified: true,
      status: "captured",
      orderId: params.orderId,
      paymentId: captureId,
      amount: capturedAmount,
      currency: capturedCurrency,
      rawPayload: orderData,
    };
  } catch (err: any) {
    return {
      verified: false,
      status: "unavailable",
      code: "PAYPAL_SERVER_ERROR",
      error: err.message || "Failed to complete PayPal server verification.",
    };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. STRIPE SERVER-SIDE INTENT & SESSION VERIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function verifyStripePayment(params: {
  paymentIntentId?: string;
  sessionId?: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}): Promise<GatewayVerificationResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || secretKey.includes("sk_test_placeholder") || secretKey.length < 10) {
    return {
      verified: false,
      status: "unavailable",
      code: "PAYMENT_VERIFICATION_UNAVAILABLE",
      error: "Stripe secret key (STRIPE_SECRET_KEY) is not configured on this server.",
    };
  }

  try {
    let intentData: any;

    if (params.paymentIntentId) {
      const resp = await fetch(`https://api.stripe.com/v1/payment_intents/${params.paymentIntentId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });

      if (!resp.ok) {
        return {
          verified: false,
          status: "failed",
          code: "STRIPE_RETRIEVAL_FAILED",
          error: `Failed to retrieve Stripe PaymentIntent: HTTP ${resp.status}`,
        };
      }
      intentData = await resp.json();
    } else if (params.sessionId) {
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${params.sessionId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });

      if (!resp.ok) {
        return {
          verified: false,
          status: "failed",
          code: "STRIPE_RETRIEVAL_FAILED",
          error: `Failed to retrieve Stripe Checkout Session: HTTP ${resp.status}`,
        };
      }
      const sessionData: any = await resp.json();
      if (sessionData.payment_intent) {
        return verifyStripePayment({
          paymentIntentId: sessionData.payment_intent,
          expectedAmount: params.expectedAmount,
          expectedCurrency: params.expectedCurrency,
        });
      }
      intentData = sessionData;
    } else {
      return {
        verified: false,
        status: "failed",
        code: "STRIPE_ID_REQUIRED",
        error: "Stripe paymentIntentId or sessionId is required.",
      };
    }

    const stripeStatus = intentData.status; // succeeded
    if (stripeStatus !== "succeeded" && intentData.payment_status !== "paid") {
      return {
        verified: false,
        status: "pending",
        code: "PAYMENT_NOT_SUCCEEDED",
        error: `Stripe payment status is '${stripeStatus || intentData.payment_status}', expected 'succeeded'.`,
        rawPayload: intentData,
      };
    }

    const stripeAmount = (intentData.amount_received || intentData.amount_total || intentData.amount || 0) / 100;
    const stripeCurrency = String(intentData.currency || "USD").toUpperCase();

    if (params.expectedAmount !== undefined && Math.abs(stripeAmount - params.expectedAmount) > 0.01) {
      return {
        verified: false,
        status: "failed",
        code: "VERIFICATION_MISMATCH",
        error: `Amount mismatch: invoice expected ${params.expectedAmount}, Stripe received ${stripeAmount}.`,
        rawPayload: intentData,
      };
    }

    if (params.expectedCurrency && stripeCurrency !== params.expectedCurrency.toUpperCase()) {
      return {
        verified: false,
        status: "failed",
        code: "VERIFICATION_MISMATCH",
        error: `Currency mismatch: invoice expected ${params.expectedCurrency}, Stripe received ${stripeCurrency}.`,
        rawPayload: intentData,
      };
    }

    return {
      verified: true,
      status: "captured",
      orderId: intentData.id,
      paymentId: intentData.id,
      amount: stripeAmount,
      currency: stripeCurrency,
      rawPayload: intentData,
    };
  } catch (err: any) {
    return {
      verified: false,
      status: "unavailable",
      code: "STRIPE_SERVER_ERROR",
      error: err.message || "Failed to complete Stripe server verification.",
    };
  }
}
