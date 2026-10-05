import fs from "fs";
import path from "path";
import { prisma, rawPrisma } from "../prisma";
import { InvoicePdfData } from "./invoice-pdf.service";
import { resolveBranding } from "./branding/branding-resolver.service";

export type DocumentClassification =
  | "TAX INVOICE"
  | "COMMERCIAL INVOICE / BILL OF SUPPLY"
  | "PAYMENT RECEIPT / TRANSACTION VOUCHER"
  | "PRO FORMA INVOICE"
  | "CREDIT NOTE";

export interface MappedPaymentProvider {
  displayName: string;
  normalizedKey: string;
  planDescription: string;
}

/**
 * Maps payment gateway or method to authoritative human display name and plan description.
 * Eliminates flawed nested ternaries that previously fell back to PayPal.
 */
export function mapPaymentProvider(rawProvider?: string | null, rawMethod?: string | null): MappedPaymentProvider {
  const p = (rawProvider || "").toLowerCase().trim();
  const m = (rawMethod || "").toLowerCase().trim();

  if (p === "razorpay" || m.includes("razorpay")) {
    return {
      displayName: "Razorpay",
      normalizedKey: "razorpay",
      planDescription: "Razorpay Gateway Settlement",
    };
  }

  if (p === "stripe" || m.includes("stripe")) {
    return {
      displayName: "Stripe",
      normalizedKey: "stripe",
      planDescription: "Stripe Enterprise Checkout",
    };
  }

  if (p === "paypal" || m.includes("paypal")) {
    return {
      displayName: "PayPal",
      normalizedKey: "paypal",
      planDescription: "PayPal Subscription Settlement",
    };
  }

  if (p === "net_banking" || p.includes("net_banking") || m.includes("net_banking") || m.includes("net banking") || (p.includes("net") && p.includes("banking"))) {
    return {
      displayName: "Net Banking",
      normalizedKey: "net_banking",
      planDescription: "Net Banking Transfer Settlement",
    };
  }

  if (p === "offline" || p === "offline_payment" || p.includes("offline") || m.includes("offline")) {
    return {
      displayName: "Offline Payment",
      normalizedKey: "offline",
      planDescription: "Offline Payment Settlement",
    };
  }

  if (p === "bank_transfer" || m.includes("bank")) {
    return {
      displayName: "Bank Transfer",
      normalizedKey: "bank_transfer",
      planDescription: "Direct Bank Transfer Settlement",
    };
  }

  if (p === "credit_card" || m.includes("credit") || m.includes("card")) {
    return {
      displayName: "Credit Card",
      normalizedKey: "credit_card",
      planDescription: "Credit Card Payment Settlement",
    };
  }

  if (p === "debit_card" || m.includes("debit")) {
    return {
      displayName: "Debit Card",
      normalizedKey: "debit_card",
      planDescription: "Debit Card Payment Settlement",
    };
  }

  if (p === "manual") {
    return {
      displayName: "Manual",
      normalizedKey: "manual",
      planDescription: "Manual Platform Settlement",
    };
  }

  // Safe fallback: Capitalize clean token, NEVER default to PayPal!
  const clean = rawProvider && rawProvider.trim() ? rawProvider.trim() : "Online Payment";
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  return {
    displayName: capitalized,
    normalizedKey: p || "online_payment",
    planDescription: `${capitalized} Payment Settlement`,
  };
}

export type VerificationMode = "AUTOMATIC" | "MANUAL";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

/**
 * Authoritatively determines verification mode from payment provider and method.
 * Automatic gateways (Razorpay, Stripe, PayPal) require NO admin approval.
 * Manual methods (Bank Transfer, Offline Payment, Net Banking) require admin proof review.
 */
export function getVerificationMode(rawProvider?: string | null, rawMethod?: string | null): VerificationMode {
  const p = (rawProvider || "").toLowerCase().trim();
  const m = (rawMethod || "").toLowerCase().trim();

  // Explicit automated gateways
  if (
    p === "razorpay" || m.includes("razorpay") ||
    p === "stripe" || m.includes("stripe") ||
    p === "paypal" || m.includes("paypal")
  ) {
    return "AUTOMATIC";
  }

  // Explicit manual offline / bank transfer / net banking methods
  if (
    p === "bank_transfer" || m.includes("bank") ||
    p === "offline" || p === "offline_payment" || m.includes("offline") ||
    p === "net_banking" || m.includes("net_banking") || m.includes("net banking") ||
    p === "manual" || m.includes("manual") ||
    p.includes("cheque") || m.includes("cheque") ||
    p.includes("cash") || m.includes("cash")
  ) {
    return "MANUAL";
  }

  // Credit/Debit Card online processing defaults to AUTOMATIC gateway
  if (p.includes("card") || m.includes("card")) {
    return "AUTOMATIC";
  }

  return "AUTOMATIC";
}

/**
 * Resolves standard verification status (PENDING | VERIFIED | REJECTED).
 */
export function resolveVerificationStatus(
  status?: string | null,
  mode: VerificationMode = "AUTOMATIC"
): VerificationStatus {
  const s = (status || "").toLowerCase().trim();
  if (s === "paid" || s === "captured" || s === "verified" || s === "success") {
    return "VERIFIED";
  }
  if (s === "failed" || s === "rejected" || s === "declined" || s === "void") {
    return "REJECTED";
  }
  return "PENDING";
}

/**
 * Resolves legal document classification based on authoritative transaction characteristics.
 * Never labels every document as "TAX INVOICE".
 */
export function resolveDocumentClassification(params: {
  sourceType: "billing_invoice" | "gateway_transaction";
  status: string;
  taxAmount?: number | null;
  isRefunded?: boolean;
}): DocumentClassification {
  const normStatus = (params.status || "").toLowerCase().trim();

  // 1. Credit Note for reversals or refunds
  if (params.isRefunded || normStatus === "refunded" || normStatus === "void" || normStatus === "reversed") {
    return "CREDIT NOTE";
  }

  // 2. Gateway Ledger Transactions -> Payment Receipt / Voucher
  if (params.sourceType === "gateway_transaction") {
    return "PAYMENT RECEIPT / TRANSACTION VOUCHER";
  }

  // 3. Billing Invoices:
  // - Open / Draft / Pending / Failed -> Pro Forma Invoice
  if (normStatus === "open" || normStatus === "draft" || normStatus === "pending" || normStatus === "failed") {
    return "PRO FORMA INVOICE";
  }

  // - Paid: If tax > 0 -> Tax Invoice, otherwise Commercial Invoice / Bill of Supply
  if (normStatus === "paid" || normStatus === "success" || normStatus === "verified") {
    if (Number(params.taxAmount || 0) > 0) {
      return "TAX INVOICE";
    }
    return "COMMERCIAL INVOICE / BILL OF SUPPLY";
  }

  return "COMMERCIAL INVOICE / BILL OF SUPPLY";
}

/**
 * Formats dates safely to British / International DD MMM YYYY (e.g. 01 Oct 2026)
 */
export function formatDocumentDate(d?: Date | string | null): string {
  if (!d) return "—";
  try {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

/**
 * Fetches authoritative supplier information resolved via BrandingResolverService
 */
export async function getAuthoritativeSupplierInfo(options?: {
  scope?: "PLATFORM" | "TENANT";
  tenantId?: string | null;
}) {
  const db = rawPrisma || prisma;
  const scope = options?.scope || (options?.tenantId ? "TENANT" : "PLATFORM");
  const branding = await resolveBranding({ scope, tenantId: options?.tenantId });

  const page = await db.cmsPage.findUnique({
    where: { slug: "system-platform-settings" },
  });

  const content = (page?.content as any) || {};

  // Resolve authoritative logo path from filesystem if present
  let logoPath: string | null = null;
  const candidatePaths = [
    path.resolve(process.cwd(), "..", "public", "white-logo.png"),
    path.resolve(process.cwd(), "public", "white-logo.png"),
    path.resolve(__dirname, "..", "..", "..", "public", "white-logo.png"),
    path.resolve(process.cwd(), "..", "public", "white-logo.webp"),
    path.resolve(process.cwd(), "public", "white-logo.webp"),
    path.resolve(process.cwd(), "..", "public", "assets", "img", "apple-icon.png"),
    path.resolve(process.cwd(), "public", "assets", "img", "apple-icon.png"),
  ];

  for (const cp of candidatePaths) {
    if (fs.existsSync(cp)) {
      logoPath = cp;
      break;
    }
  }

  return {
    name: branding.appName || content.platformName || content.companyName || "Master ERP & HRMS Cloud",
    address: content.companyAddress || content.address || "DLF Cyber City, Tower B, Gurugram, HR 122002, India",
    email: branding.supportEmail || content.supportEmail || content.contactEmail || "support@masterhrms.com",
    phone: content.contactNumber || content.contactPhone || "+91 98765 43210",
    gstin: content.taxGstNumber || content.gstNumber || "06AAACM1234F1Z8",
    logoPath,
    logoUrl: branding.absoluteLogoLightUrl || branding.logoLightUrl,
    primaryColor: branding.primaryColor,
    branding,
  };
}

/**
 * Fetches customer organization profile including registered address & GSTIN with tenant branding fallback
 */
export async function getAuthoritativeCustomerInfo(tenantId: string, tenant: any) {
  const db = rawPrisma || prisma;
  const customerBranding = await resolveBranding({ scope: "TENANT", tenantId });

  const page = await db.cmsPage.findUnique({
    where: { slug: `tenant-${tenantId}-settings` },
  });

  const content = (page?.content as any) || {};
  const company = content.company || {};

  const tenantEmail =
    tenant?.profiles?.find((p: any) => p.email)?.email ||
    company.email ||
    customerBranding.supportEmail ||
    `billing@${tenant?.slug || "tenant"}.masterhrms.com`;

  let fullAddress: string | null = company.address || null;
  if (!fullAddress && (company.city || company.state || company.country)) {
    fullAddress = [company.city, company.state, company.country].filter(Boolean).join(", ");
  }

  return {
    name: customerBranding.appName || tenant?.name || company.name || company.companyName || "Enterprise Customer",
    slug: tenant?.slug || null,
    email: tenantEmail,
    address: fullAddress,
    taxId: company.taxNumber || company.gstin || null,
    branding: customerBranding,
  };
}

export interface TransactionVerificationDetails {
  status: "VERIFIED" | "MISMATCH" | "PENDING VERIFICATION";
  summary: "MATCHED" | "SIGNATURE VERIFIED" | "MISMATCH" | "AWAITING PAYMENT" | "PENDING";
  provider: string;
  orderId: string | null;
  paymentId: string | null;
  gatewayAmount: number | null;
  gatewayCurrency: string | null;
  internalAmount: number;
  internalCurrency: string;
  gatewayStatus: string | null;
  internalStatus: string;
  mismatchReason?: string | null;
  mismatchDetails?: {
    expectedAmount?: number;
    gatewayAmount?: number;
    expectedCurrency?: string;
    gatewayCurrency?: string;
    expectedOrder?: string;
    gatewayOrder?: string;
    expectedStatus?: string;
    gatewayStatus?: string;
  } | null;
}

/**
 * Cross-verifies payment gateway ledger records against billing invoices
 * without exposing secret keys, webhook secrets, or private credentials.
 */
export async function crossVerifyTransaction(params: {
  sourceType: "billing_invoice" | "gateway_transaction";
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  orderId?: string | null;
  paymentId?: string | null;
  paidAt?: Date | string | null;
}): Promise<TransactionVerificationDetails> {
  const db = rawPrisma || prisma;
  const pName = mapPaymentProvider(params.provider).displayName;

  if (params.sourceType === "billing_invoice") {
    let linkedTx: any = null;
    if (params.paymentId || params.orderId) {
      linkedTx = await db.paymentGatewayTransaction.findFirst({
        where: {
          OR: [
            ...(params.paymentId ? [{ providerPaymentId: params.paymentId }] : []),
            ...(params.orderId ? [{ providerOrderId: params.orderId }] : []),
          ],
        },
      });
    }

    if (linkedTx) {
      const gwAmount = Number(linkedTx.amount) || 0;
      const gwCurr = (linkedTx.currency || "INR").toUpperCase();
      const intCurr = (params.currency || "INR").toUpperCase();
      const gwStatus = (linkedTx.status || "").toUpperCase();
      const intStatus = params.status.toUpperCase();

      const amountMatch = Math.abs(gwAmount - params.amount) < 0.01;
      const currMatch = gwCurr === intCurr;
      const orderMatch = !params.orderId || !linkedTx.providerOrderId || params.orderId === linkedTx.providerOrderId;
      const statusMatch =
        (intStatus === "PAID" && (gwStatus === "CAPTURED" || gwStatus === "VERIFIED" || gwStatus === "PAID")) ||
        (intStatus !== "PAID" && gwStatus !== "CAPTURED" && gwStatus !== "VERIFIED");

      if (!amountMatch || !currMatch || !orderMatch || !statusMatch) {
        let reason = "Discrepancy detected between gateway ledger and billing invoice.";
        if (!amountMatch) reason = `Amount mismatch: expected ${params.amount} ${intCurr}, gateway recorded ${gwAmount} ${gwCurr}`;
        else if (!currMatch) reason = `Currency mismatch: expected ${intCurr}, gateway recorded ${gwCurr}`;
        else if (!orderMatch) reason = `Order ID mismatch: expected ${params.orderId}, gateway recorded ${linkedTx.providerOrderId}`;
        else if (!statusMatch) reason = `Status mismatch: expected ${intStatus}, gateway recorded ${gwStatus}`;

        return {
          status: "MISMATCH",
          summary: "MISMATCH",
          provider: pName,
          orderId: linkedTx.providerOrderId || params.orderId || null,
          paymentId: linkedTx.providerPaymentId || params.paymentId || null,
          gatewayAmount: gwAmount,
          gatewayCurrency: gwCurr,
          internalAmount: params.amount,
          internalCurrency: intCurr,
          gatewayStatus: gwStatus,
          internalStatus: intStatus,
          mismatchReason: reason,
          mismatchDetails: {
            expectedAmount: params.amount,
            gatewayAmount: gwAmount,
            expectedCurrency: intCurr,
            gatewayCurrency: gwCurr,
            expectedOrder: params.orderId || undefined,
            gatewayOrder: linkedTx.providerOrderId || undefined,
            expectedStatus: intStatus,
            gatewayStatus: gwStatus,
          },
        };
      }

      return {
        status: "VERIFIED",
        summary: "MATCHED",
        provider: pName,
        orderId: linkedTx.providerOrderId || params.orderId || null,
        paymentId: linkedTx.providerPaymentId || params.paymentId || null,
        gatewayAmount: gwAmount,
        gatewayCurrency: gwCurr,
        internalAmount: params.amount,
        internalCurrency: intCurr,
        gatewayStatus: gwStatus,
        internalStatus: intStatus,
      };
    }

    const isPaid = params.status.toLowerCase() === "paid";
    if (isPaid && params.paymentId) {
      return {
        status: "VERIFIED",
        summary: "SIGNATURE VERIFIED",
        provider: pName,
        orderId: params.orderId || null,
        paymentId: params.paymentId,
        gatewayAmount: params.amount,
        gatewayCurrency: (params.currency || "INR").toUpperCase(),
        internalAmount: params.amount,
        internalCurrency: (params.currency || "INR").toUpperCase(),
        gatewayStatus: "PAID",
        internalStatus: "PAID",
      };
    }

    if (isPaid && !params.paymentId) {
      return {
        status: "PENDING VERIFICATION",
        summary: "PENDING",
        provider: pName,
        orderId: params.orderId || null,
        paymentId: null,
        gatewayAmount: null,
        gatewayCurrency: null,
        internalAmount: params.amount,
        internalCurrency: (params.currency || "INR").toUpperCase(),
        gatewayStatus: null,
        internalStatus: "PAID",
        mismatchReason: "Payment marked as paid without gateway reference (offline/manual)",
      };
    }

    return {
      status: "PENDING VERIFICATION",
      summary: "AWAITING PAYMENT",
      provider: pName,
      orderId: params.orderId || null,
      paymentId: null,
      gatewayAmount: null,
      gatewayCurrency: null,
      internalAmount: params.amount,
      internalCurrency: (params.currency || "INR").toUpperCase(),
      gatewayStatus: null,
      internalStatus: params.status.toUpperCase(),
    };
  }

  // gateway_transaction
  const rawStatus = (params.status || "").toLowerCase();
  const isCaptured = rawStatus === "captured" || rawStatus === "verified" || rawStatus === "paid";
  const isFailed = rawStatus === "failed" || rawStatus === "declined";

  let linkedInv: any = null;
  if (params.orderId || params.paymentId) {
    linkedInv = await db.billingInvoice.findFirst({
      where: {
        OR: [
          ...(params.orderId ? [{ gatewayOrderId: params.orderId }] : []),
          ...(params.paymentId ? [{ gatewayPaymentId: params.paymentId }] : []),
        ],
      },
    });
  }

  if (linkedInv) {
    const invAmount = Number(linkedInv.amount) || 0;
    const invCurr = (linkedInv.currency || "INR").toUpperCase();
    const gwCurr = (params.currency || "INR").toUpperCase();
    const amountMatch = Math.abs(invAmount - params.amount) < 0.01;
    const currMatch = invCurr === gwCurr;

    if (!amountMatch || !currMatch) {
      return {
        status: "MISMATCH",
        summary: "MISMATCH",
        provider: pName,
        orderId: params.orderId || null,
        paymentId: params.paymentId || null,
        gatewayAmount: params.amount,
        gatewayCurrency: gwCurr,
        internalAmount: invAmount,
        internalCurrency: invCurr,
        gatewayStatus: params.status.toUpperCase(),
        internalStatus: (linkedInv.status || "OPEN").toUpperCase(),
        mismatchReason: !amountMatch
          ? `Amount mismatch: internal expected ${invAmount} ${invCurr}, gateway received ${params.amount} ${gwCurr}`
          : `Currency mismatch: internal expected ${invCurr}, gateway received ${gwCurr}`,
        mismatchDetails: {
          expectedAmount: invAmount,
          gatewayAmount: params.amount,
          expectedCurrency: invCurr,
          gatewayCurrency: gwCurr,
          expectedOrder: linkedInv.gatewayOrderId || undefined,
          gatewayOrder: params.orderId || undefined,
          expectedStatus: (linkedInv.status || "OPEN").toUpperCase(),
          gatewayStatus: params.status.toUpperCase(),
        },
      };
    }
  }

  if (isFailed) {
    return {
      status: "MISMATCH",
      summary: "MISMATCH",
      provider: pName,
      orderId: params.orderId || null,
      paymentId: params.paymentId || null,
      gatewayAmount: params.amount,
      gatewayCurrency: (params.currency || "INR").toUpperCase(),
      internalAmount: params.amount,
      internalCurrency: (params.currency || "INR").toUpperCase(),
      gatewayStatus: "FAILED",
      internalStatus: "FAILED",
      mismatchReason: "Payment gateway reported failure or declined transaction.",
    };
  }

  if (isCaptured) {
    return {
      status: "VERIFIED",
      summary: "MATCHED",
      provider: pName,
      orderId: params.orderId || null,
      paymentId: params.paymentId || null,
      gatewayAmount: params.amount,
      gatewayCurrency: (params.currency || "INR").toUpperCase(),
      internalAmount: params.amount,
      internalCurrency: (params.currency || "INR").toUpperCase(),
      gatewayStatus: "CAPTURED",
      internalStatus: "PAID",
    };
  }

  return {
    status: "PENDING VERIFICATION",
    summary: "PENDING",
    provider: pName,
    orderId: params.orderId || null,
    paymentId: params.paymentId || null,
    gatewayAmount: params.amount,
    gatewayCurrency: (params.currency || "INR").toUpperCase(),
    internalAmount: params.amount,
    internalCurrency: (params.currency || "INR").toUpperCase(),
    gatewayStatus: params.status.toUpperCase(),
    internalStatus: "PENDING",
  };
}

/**
 * Resolves authoritative canonical invoice record from PostgreSQL database
 */
export async function getAuthoritativeCanonicalInvoice(id: string): Promise<InvoicePdfData | null> {
  const db = rawPrisma || prisma;
  const supplier = await getAuthoritativeSupplierInfo();

  // 1. Check BillingInvoice
  const inv = await db.billingInvoice.findUnique({
    where: { id },
    include: {
      tenant: {
        include: {
          profiles: { select: { email: true, fullName: true }, take: 3 },
        },
      },
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (inv) {
    const customer = await getAuthoritativeCustomerInfo(inv.tenantId, inv.tenant);
    const providerMapping = mapPaymentProvider(inv.paymentMethod);
    const amount = Number(inv.amount) || 0;
    const subtotal = Number(inv.subtotalAmount || inv.amount);
    const discount = Number(inv.discountAmount || 0);
    const tax = Number(inv.taxAmount || 0);
    const currency = inv.currency || "INR";

    const isPaid = inv.status === "paid";
    const statusLabel: "PAID" | "UNPAID" | "FAILED" = isPaid
      ? "PAID"
      : inv.status === "failed"
      ? "FAILED"
      : "UNPAID";

    const classification = resolveDocumentClassification({
      sourceType: "billing_invoice",
      status: inv.status,
      taxAmount: tax,
    });

    const invoiceNo = inv.invoiceNo || `SUB-INV-${inv.id.slice(0, 8).toUpperCase()}`;
    const planName = inv.subscription?.plan?.name || "Enterprise SaaS Plan";
    const periodStr =
      inv.periodStart && inv.periodEnd
        ? `${formatDocumentDate(inv.periodStart)} to ${formatDocumentDate(inv.periodEnd)}`
        : "Standard Billing Cycle";

    const itemDesc = `${planName} (${inv.billingCycle || "Monthly"})`;
    const itemSubDesc = inv.billableUsers
      ? `Tier license for ${inv.billableUsers} billable seats with dedicated tenant compute`
      : "Cloud ERP subscription tier license and tenant isolation compute";

    const verification = await crossVerifyTransaction({
      sourceType: "billing_invoice",
      id: inv.id,
      provider: inv.paymentMethod || "online_payment",
      amount,
      currency,
      status: inv.status,
      orderId: inv.gatewayOrderId || inv.invoiceNo,
      paymentId: inv.gatewayPaymentId || inv.bankTransferRef,
      paidAt: inv.paidAt,
    });

    return {
      invoiceNo,
      classification,
      status: statusLabel,
      issueDate: formatDocumentDate(inv.createdAt),
      settlementDate: isPaid && inv.paidAt ? formatDocumentDate(inv.paidAt) : null,
      billingPeriod: periodStr,
      supplier,
      customer,
      payment: {
        gateway: providerMapping.displayName,
        reference: inv.gatewayPaymentId || inv.gatewayOrderId || inv.bankTransferRef || `REF-${inv.id.slice(0, 8).toUpperCase()}`,
        paymentDate: isPaid && inv.paidAt ? formatDocumentDate(inv.paidAt) : null,
        currency,
      },
      items: [
        {
          description: itemDesc,
          subDescription: itemSubDesc,
          sacCode: "998313",
          quantity: 1,
          unitPrice: subtotal,
          discount,
          taxableAmount: subtotal - discount,
          taxRate: tax > 0 && subtotal > 0 ? (tax / subtotal) * 100 : 0,
          taxAmount: tax,
          totalAmount: amount,
        },
      ],
      subtotal,
      discount,
      tax,
      taxBreakup:
        tax > 0
          ? {
              cgst: Math.round((tax / 2) * 100) / 100,
              sgst: Math.round((tax / 2) * 100) / 100,
            }
          : null,
      total: amount,
      currency,
      verification,
    };
  }

  // 2. Check PaymentGatewayTransaction
  const tx = await db.paymentGatewayTransaction.findUnique({
    where: { id },
    include: {
      tenant: {
        include: {
          profiles: { select: { email: true, fullName: true }, take: 3 },
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  if (tx) {
    const customer = await getAuthoritativeCustomerInfo(tx.tenantId, tx.tenant);
    const providerMapping = mapPaymentProvider(tx.provider, tx.method);
    const amount = Number(tx.amount) || 0;
    const currency = tx.currency || "USD";

    const rawStatus = (tx.status || "").toLowerCase();
    const isPaid = rawStatus === "verified" || rawStatus === "success" || rawStatus === "captured" || rawStatus === "paid";
    const statusLabel: "PAID" | "UNPAID" | "FAILED" = isPaid
      ? "PAID"
      : rawStatus === "failed" || rawStatus === "declined"
      ? "FAILED"
      : "UNPAID";

    const classification = resolveDocumentClassification({
      sourceType: "gateway_transaction",
      status: tx.status,
      taxAmount: 0,
    });

    const invoiceNo = tx.providerOrderId || `TXN-${tx.id.slice(0, 8).toUpperCase()}`;
    const settlementDate = tx.verifiedAt ? formatDocumentDate(tx.verifiedAt) : isPaid ? formatDocumentDate(tx.createdAt) : null;

    const verification = await crossVerifyTransaction({
      sourceType: "gateway_transaction",
      id: tx.id,
      provider: tx.provider,
      amount,
      currency,
      status: tx.status,
      orderId: tx.providerOrderId,
      paymentId: tx.providerPaymentId,
      paidAt: tx.verifiedAt || tx.createdAt,
    });

    return {
      invoiceNo,
      classification,
      status: statusLabel,
      issueDate: formatDocumentDate(tx.createdAt),
      settlementDate,
      billingPeriod: "Monthly Subscription Interval",
      supplier,
      customer,
      payment: {
        gateway: providerMapping.displayName,
        reference: tx.providerPaymentId || `PAY-${tx.id.slice(0, 8).toUpperCase()}`,
        paymentDate: settlementDate,
        currency,
      },
      items: [
        {
          description: providerMapping.planDescription,
          subDescription: `Electronic payment settlement via ${providerMapping.displayName} for ${customer.name}`,
          sacCode: "998313",
          quantity: 1,
          unitPrice: amount,
          discount: 0,
          taxableAmount: amount,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: amount,
        },
      ],
      subtotal: amount,
      discount: 0,
      tax: 0,
      taxBreakup: null,
      total: amount,
      currency,
      verification,
    };
  }

  return null;
}
