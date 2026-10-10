/**
 * MASTERHRMS — Phase A3.7: Razorpay Sandbox Integration Service
 *
 * Operational Boundaries:
 * 1. Strictly non-production sandbox execution.
 * 2. Absolute prohibition on live credentials (rzp_live_*).
 * 3. Timing-safe cryptographic HMAC-SHA256 signature verification.
 * 4. Zero exposure of secret credentials in logs or errors.
 * 5. Deterministic test transport support for isolated testing.
 */

import crypto from "crypto";

export class RazorpaySandboxError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "RazorpaySandboxError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface CreateRazorpayOrderInput {
  orderId: string;
  orderNumber: string;
  amountInPaise: number;
  currency: string;
  tenantId: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export type RazorpayTransport = (
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{ status: number; ok: boolean; json: () => Promise<any>; text: () => Promise<string> }>;

export class RazorpaySandboxService {
  private static mockTransport: RazorpayTransport | null = null;

  /**
   * Sets a custom transport for offline sandbox testing.
   */
  public static setMockTransport(transport: RazorpayTransport | null): void {
    this.mockTransport = transport;
  }

  /**
   * Resolves and verifies the sandbox Key ID.
   * Fails closed if a live key (rzp_live_*) is detected.
   */
  public static getKeyId(): string {
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();

    if (keyId.startsWith("rzp_live_")) {
      throw new RazorpaySandboxError(
        "LIVE_KEYS_PROHIBITED_IN_SANDBOX",
        "Live Razorpay credentials (rzp_live_*) are strictly prohibited in sandbox mode.",
        400
      );
    }

    return keyId || "rzp_test_MasterHRMSKey";
  }

  /**
   * Resolves the sandbox Key Secret.
   */
  public static getKeySecret(): string {
    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    return secret || "rzp_test_secret_default";
  }

  /**
   * Resolves the sandbox Webhook Secret.
   */
  public static getWebhookSecret(): string {
    return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  }

  /**
   * Creates an order on Razorpay Sandbox API.
   */
  public static async createOrder(input: CreateRazorpayOrderInput): Promise<RazorpayOrderResponse> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (!input.amountInPaise || input.amountInPaise <= 0 || !Number.isInteger(input.amountInPaise)) {
      throw new RazorpaySandboxError(
        "INVALID_AMOUNT",
        "Order amount in paise must be a positive integer.",
        400
      );
    }

    if (!input.currency || typeof input.currency !== "string") {
      throw new RazorpaySandboxError(
        "INVALID_CURRENCY",
        "Order currency is required.",
        400
      );
    }

    const payload = {
      amount: input.amountInPaise,
      currency: input.currency.toUpperCase(),
      receipt: input.orderNumber,
      notes: {
        orderId: input.orderId,
        tenantId: input.tenantId,
        ...(input.notes || {}),
      },
    };

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    try {
      const transport = this.mockTransport || (fetch as any);
      const resp = await transport("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        let errBody: any;
        try {
          errBody = await resp.json();
        } catch {
          errBody = { error: { description: "Gateway error" } };
        }
        const description = errBody?.error?.description || `HTTP ${resp.status}`;
        throw new RazorpaySandboxError(
          "GATEWAY_ORDER_CREATION_FAILED",
          `Razorpay sandbox order creation failed: ${description}`,
          502
        );
      }

      const data = await resp.json();
      return data as RazorpayOrderResponse;
    } catch (err: any) {
      if (err instanceof RazorpaySandboxError) {
        throw err;
      }
      throw new RazorpaySandboxError(
        "GATEWAY_COMMUNICATION_ERROR",
        `Failed to reach Razorpay sandbox gateway: ${err.message || "Network error"}`,
        502
      );
    }
  }

  /**
   * Verifies the cryptographic HMAC-SHA256 signature of an incoming webhook payload.
   * Uses timingSafeEqual to prevent timing side-channel attacks.
   */
  public static verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
    secretOverride?: string
  ): boolean {
    const secret = secretOverride || this.getWebhookSecret();

    // Fail closed: Webhook secret must be present
    if (!secret) {
      throw new RazorpaySandboxError(
        "WEBHOOK_VERIFICATION_UNAVAILABLE",
        "Razorpay webhook signing secret is not configured.",
        500
      );
    }

    // Fail closed: Signature header must be present
    if (!signature || typeof signature !== "string") {
      throw new RazorpaySandboxError(
        "INVALID_SIGNATURE",
        "Missing or empty x-razorpay-signature header.",
        400
      );
    }

    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyBuffer)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature.trim(), "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  /**
   * Utility for testing: Computes valid HMAC-SHA256 hex digest for a given raw body and secret.
   */
  public static computeSignature(rawBody: Buffer | string, secret: string): string {
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    return crypto.createHmac("sha256", secret).update(bodyBuffer).digest("hex");
  }
}
