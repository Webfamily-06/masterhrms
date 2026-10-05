import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { rawPrisma } from "../src/prisma";
import { getAuthoritativeCanonicalInvoice } from "../src/services/invoice-engine.service";
import { generateInvoicePdf, CanonicalInvoice } from "../src/services/invoice-pdf.service";

dotenv.config();

const ARTIFACTS_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity-ide\\brain\\2215b1d4-7591-4008-ad4e-0a76f34bd6d4";

async function main() {
  const db = rawPrisma;

  console.log("=== Generating 5 Authoritative Invoice / Receipt PDFs ===");

  // 1. Stripe USD (from DB INV-2024-001)
  const stripeTx = await db.paymentGatewayTransaction.findFirst({ where: { providerOrderId: "INV-2024-001" } });
  if (!stripeTx) throw new Error("Missing stripeTx");
  const stripeCanonical = await getAuthoritativeCanonicalInvoice(stripeTx.id);
  if (!stripeCanonical) throw new Error("Could not resolve stripe canonical");
  const stripePdf = await generateInvoicePdf(stripeCanonical);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "1_stripe_usd.pdf"), stripePdf);
  console.log("✔ 1. Stripe USD -> 1_stripe_usd.pdf", stripePdf.length, "bytes");

  // 2. PayPal USD (from DB INV-2024-002)
  const paypalTx = await db.paymentGatewayTransaction.findFirst({ where: { providerOrderId: "INV-2024-002" } });
  if (!paypalTx) throw new Error("Missing paypalTx");
  const paypalCanonical = await getAuthoritativeCanonicalInvoice(paypalTx.id);
  if (!paypalCanonical) throw new Error("Could not resolve paypal canonical");
  const paypalPdf = await generateInvoicePdf(paypalCanonical);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "2_paypal_usd.pdf"), paypalPdf);
  console.log("✔ 2. PayPal USD -> 2_paypal_usd.pdf", paypalPdf.length, "bytes");

  // 3. Razorpay INR (from DB SUB-INV-2026-0002)
  const rzpInv = await db.billingInvoice.findFirst({ where: { invoiceNo: "SUB-INV-2026-0002" } });
  if (!rzpInv) throw new Error("Missing rzpInv");
  const rzpCanonical = await getAuthoritativeCanonicalInvoice(rzpInv.id);
  if (!rzpCanonical) throw new Error("Could not resolve razorpay canonical");
  // ensure status is paid for receipt rendering test
  const rzpPaidCanonical: CanonicalInvoice = {
    ...rzpCanonical,
    status: "PAID",
    settlementDate: "2026-10-05T12:00:00.000Z",
    payment: {
      ...rzpCanonical.payment,
      gateway: "Razorpay",
      reference: "pay_RzpSample99912",
      status: "PAID",
      amount: 2900,
    },
  };
  const rzpPdf = await generateInvoicePdf(rzpPaidCanonical);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "3_razorpay_inr.pdf"), rzpPdf);
  console.log("✔ 3. Razorpay INR -> 3_razorpay_inr.pdf", rzpPdf.length, "bytes");

  // 4. Offline Payment INR
  const offlineCanonical: CanonicalInvoice = {
    ...rzpCanonical,
    invoiceNo: "OFF-INV-2026-004",
    documentClassification: "PAYMENT RECEIPT / TRANSACTION VOUCHER",
    classification: "PAYMENT RECEIPT / TRANSACTION VOUCHER",
    status: "PAID",
    issueDate: "2026-10-04T09:30:00.000Z",
    settlementDate: "2026-10-04T10:15:00.000Z",
    currency: "INR",
    total: 7500,
    subtotal: 7500,
    items: [
      {
        description: "Enterprise Yearly License (10 Seats) — Offline Bank Payment",
        quantity: 1,
        unitPrice: 7500,
        amount: 7500,
      },
    ],
    payment: {
      gateway: "Offline Payment",
      reference: "OFF-UTR-991823771",
      method: "Offline / Bank Transfer",
      status: "PAID",
      amount: 7500,
      paymentDate: "2026-10-04T10:15:00.000Z",
    },
  };
  const offlinePdf = await generateInvoicePdf(offlineCanonical);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "4_offline_inr.pdf"), offlinePdf);
  console.log("✔ 4. Offline Payment INR -> 4_offline_inr.pdf", offlinePdf.length, "bytes");

  // 5. Net Banking INR
  const netBankingCanonical: CanonicalInvoice = {
    ...rzpCanonical,
    invoiceNo: "NET-INV-2026-005",
    documentClassification: "PAYMENT RECEIPT / TRANSACTION VOUCHER",
    classification: "PAYMENT RECEIPT / TRANSACTION VOUCHER",
    status: "PAID",
    issueDate: "2026-10-05T08:00:00.000Z",
    settlementDate: "2026-10-05T08:05:00.000Z",
    currency: "INR",
    total: 12000,
    subtotal: 12000,
    items: [
      {
        description: "Scale Plan (Annual Subscription) — Instant Net Banking Settlement",
        quantity: 1,
        unitPrice: 12000,
        amount: 12000,
      },
    ],
    payment: {
      gateway: "Net Banking",
      reference: "NB-HDFC-882736152",
      method: "Net Banking (HDFC Corporate)",
      status: "PAID",
      amount: 12000,
      paymentDate: "2026-10-05T08:05:00.000Z",
    },
  };
  const netBankingPdf = await generateInvoicePdf(netBankingCanonical);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "5_net_banking_inr.pdf"), netBankingPdf);
  console.log("✔ 5. Net Banking INR -> 5_net_banking_inr.pdf", netBankingPdf.length, "bytes");

  console.log("=== All 5 sample PDFs successfully generated ===");
}

main().catch((e) => {
  console.error("PDF generation failed:", e);
  process.exit(1);
});
