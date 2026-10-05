import { generateInvoicePdf, InvoicePdfData } from "../src/services/invoice-pdf.service";
import fs from "fs";

async function main() {
  const testData: InvoicePdfData = {
    invoiceNo: "INV-2024-003",
    classification: "PAYMENT RECEIPT / TRANSACTION VOUCHER",
    status: "PAID",
    issueDate: "01 Oct 2026",
    settlementDate: "01 Oct 2026",
    billingPeriod: "Monthly Subscription Interval",
    supplier: {
      name: "Master ERP & HRMS Cloud",
      address: "DLF Cyber City, Gurugram, India",
      email: "support@masterhrms.com",
      phone: "+91 98765 43210",
      gstin: "07AAAAA0000A1Z5",
    },
    customer: {
      name: "Master Enterprise ERP",
      slug: "master",
      email: "gowthamtooquik@gmail.com",
      address: "Bangalore Tech Park, India",
      taxId: null,
    },
    payment: {
      gateway: "Razorpay",
      reference: "PAY-1790871493972-2",
      paymentDate: "01 Oct 2026",
      currency: "USD",
    },
    items: [
      {
        description: "Razorpay Gateway Settlement",
        subDescription: "Enterprise cloud subscription settlement ledger record",
        sacCode: "998313",
        quantity: 1,
        unitPrice: 999,
        discount: 0,
        taxableAmount: 999,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: 999,
      },
    ],
    subtotal: 999,
    discount: 0,
    tax: 0,
    total: 999,
    currency: "USD",
  };

  console.log("Generating test PDF for INV-2024-003...");
  const pdfBuffer = await generateInvoicePdf(testData);
  console.log("PDF generated! Buffer size:", pdfBuffer.length, "bytes");
  console.log("PDF header magic bytes:", pdfBuffer.slice(0, 5).toString("utf-8")); // Should be %PDF-

  if (pdfBuffer.slice(0, 5).toString("utf-8") !== "%PDF-") {
    throw new Error("Invalid PDF header!");
  }
}

main().catch(console.error);
