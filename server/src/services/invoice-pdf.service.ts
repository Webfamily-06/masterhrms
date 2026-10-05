import fs from "fs";
import PDFDocument from "pdfkit";

export interface InvoiceItem {
  description: string;
  subDescription?: string | null;
  sacCode?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxableAmount: number;
  taxRate?: number;
  taxAmount: number;
  totalAmount: number;
  amount?: number;
}

export interface InvoicePdfData {
  invoiceNo: string;
  classification:
    | "TAX INVOICE"
    | "COMMERCIAL INVOICE / BILL OF SUPPLY"
    | "PAYMENT RECEIPT / TRANSACTION VOUCHER"
    | "PRO FORMA INVOICE"
    | "CREDIT NOTE";
  status: "PAID" | "UNPAID" | "FAILED" | "PENDING";
  issueDate: string;
  settlementDate?: string | null;
  billingPeriod?: string | null;

  // Supplier (Platform or Tenant Billing Organization)
  supplier: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    logoPath?: string | null;
    logoBuffer?: Buffer | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
  };

  // Customer (Tenant)
  customer: {
    name: string;
    slug?: string | null;
    email: string;
    address?: string | null;
    taxId?: string | null;
  };

  // Payment
  payment: {
    gateway: string;
    reference?: string | null;
    paymentDate?: string | null;
    currency: string;
  };

  // Items & Financials
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxBreakup?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
  } | null;
  total: number;
  currency: string;
  notes?: string | null;
  verification?: {
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
  };
}

/**
 * Format currency with authoritative ISO code and symbol
 */
export function formatCurrencyWithIso(amount: number, currency: string = "USD"): string {
  const norm = (currency || "USD").toUpperCase();
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  const safeNum = isNaN(num) ? 0 : num;

  let symbol = "$";
  if (norm === "INR") symbol = "₹";
  else if (norm === "EUR") symbol = "€";
  else if (norm === "GBP") symbol = "£";

  return `${symbol}${safeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${norm}`;
}

/**
 * Generate a vector PDF document buffer using PDFKit with branding & logo
 */
export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const formatPdfCurrency = (amount: number, currency?: string) =>
        formatCurrencyWithIso(amount, currency).replace(/₹/g, "Rs. ");

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Invoice #${data.invoiceNo}`,
          Author: data.supplier.name || "Master HRMS Cloud",
          Subject: `${data.classification} #${data.invoiceNo}`,
          Keywords: "invoice, billing, transaction, receipt, hrms",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left;
      let y = doc.page.margins.top;

      // ─────────────────────────────────────────────────────────────────
      // 1. TOP ACCENT BAR
      // ─────────────────────────────────────────────────────────────────
      const accentColor = data.supplier.primaryColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.supplier.primaryColor)
        ? data.supplier.primaryColor
        : "#2563EB";
      doc.rect(startX, y, pageWidth, 4).fill(accentColor);
      y += 16;

      // ─────────────────────────────────────────────────────────────────
      // 2. HEADER: LOGO (LEFT) & SUPPLIER INFO (RIGHT)
      // ─────────────────────────────────────────────────────────────────
      const headerStartY = y;
      const logoBoxWidth = 150;
      const logoBoxHeight = 44;

      // Left: Company Logo Rendering
      const logoSource = data.supplier.logoBuffer || data.supplier.logoPath;
      let logoRendered = false;

      if (logoSource) {
        try {
          if (Buffer.isBuffer(logoSource) || (typeof logoSource === "string" && fs.existsSync(logoSource))) {
            doc.roundedRect(startX, y, logoBoxWidth, logoBoxHeight, 4).fill("#0F172A");
            doc.image(logoSource, startX + 8, y + 6, { fit: [134, 32] });
            logoRendered = true;
          }
        } catch (imgErr) {
          console.warn("[PDF Generator] Logo rendering warning, falling back to typography monogram:", imgErr);
        }
      }

      if (!logoRendered) {
        // Professional Typography Monogram Box (Fallback using resolved supplier app name)
        const monogramText = (data.supplier.name || "MASTER HRMS").toUpperCase();
        doc.roundedRect(startX, y, logoBoxWidth, logoBoxHeight, 4).fill("#0F172A");
        doc.fontSize(monogramText.length > 15 ? 9 : 11).font("Helvetica-Bold").fillColor("#FFFFFF").text(monogramText, startX + 10, y + 15, {
          width: 130,
          align: "center",
        });
      }

      // Tagline under logo box
      doc.fontSize(7.5).font("Helvetica").fillColor("#64748B").text("Enterprise ERP & HRMS Cloud Platform", startX, y + logoBoxHeight + 6, {
        width: logoBoxWidth,
      });

      const leftBottomY = y + logoBoxHeight + 20;

      // Right: Supplier Details
      const rightX = startX + 220;
      const rightWidth = pageWidth - 220;
      let rightY = headerStartY;

      doc.fontSize(13).font("Helvetica-Bold").fillColor("#0F172A").text(data.supplier.name || "Master ERP & HRMS Cloud", rightX, rightY, {
        width: rightWidth,
        align: "right",
      });
      rightY += 16;

      doc.fontSize(8.5).font("Helvetica").fillColor("#475569");
      if (data.supplier.address) {
        doc.text(data.supplier.address, rightX, rightY, { width: rightWidth, align: "right" });
        rightY += 12;
      }
      if (data.supplier.email) {
        doc.text(`Support: ${data.supplier.email}`, rightX, rightY, { width: rightWidth, align: "right" });
        rightY += 12;
      }
      if (data.supplier.phone) {
        doc.text(`Phone: ${data.supplier.phone}`, rightX, rightY, { width: rightWidth, align: "right" });
        rightY += 12;
      }
      if (data.supplier.gstin) {
        doc.font("Helvetica-Bold").fillColor("#0F172A").text(`GSTIN / Tax ID: ${data.supplier.gstin}`, rightX, rightY, {
          width: rightWidth,
          align: "right",
        });
        rightY += 14;
      }

      y = Math.max(leftBottomY, rightY) + 12;

      // Header Divider Line
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
      y += 14;

      // ─────────────────────────────────────────────────────────────────
      // 3. DOCUMENT CLASSIFICATION & METADATA GRID
      // ─────────────────────────────────────────────────────────────────
      const metaLeftWidth = 300;
      const metaRightX = startX + metaLeftWidth;
      const metaRightWidth = pageWidth - metaLeftWidth;
      const metaStartY = y;

      // Left Column: Document Classification, Invoice No, Dates
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#EA580C").text(data.classification, startX, y, { width: metaLeftWidth });
      y += 16;

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#0F172A").text(`#${data.invoiceNo}`, startX, y, { width: metaLeftWidth });
      y += 15;

      doc.fontSize(8.5).font("Helvetica").fillColor("#64748B");
      doc.text(`Issue Date: ${data.issueDate}`, startX, y);
      y += 12;

      if (data.settlementDate) {
        doc.text(`Settlement Date: ${data.settlementDate}`, startX, y);
        y += 12;
      }

      if (data.billingPeriod) {
        doc.text(`Billing Interval: ${data.billingPeriod}`, startX, y);
        y += 12;
      }

      const metaLeftBottomY = y;

      // Right Column: Status Badge & Payment Reference
      let metaRightY = metaStartY;
      const isPaid = data.status === "PAID";
      const statusBg = isPaid ? "#DCFCE7" : data.status === "FAILED" ? "#FEE2E2" : "#FEF3C7";
      const statusText = isPaid ? "#15803D" : data.status === "FAILED" ? "#B91C1C" : "#B45309";

      // Status Pill Box
      const badgeWidth = 90;
      const badgeHeight = 20;
      const badgeX = startX + pageWidth - badgeWidth;

      doc.roundedRect(badgeX, metaRightY, badgeWidth, badgeHeight, 4).fill(statusBg);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(statusText).text(`[ ${data.status} ]`, badgeX, metaRightY + 5, {
        width: badgeWidth,
        align: "center",
      });
      metaRightY += badgeHeight + 10;

      doc.fontSize(8.5).font("Helvetica").fillColor("#64748B");
      if (data.payment.reference) {
        doc.text(`Reference: ${data.payment.reference}`, metaRightX, metaRightY, { width: metaRightWidth, align: "right" });
        metaRightY += 12;
      }

      doc.text(`Authoritative Currency: ${data.payment.currency || data.currency}`, metaRightX, metaRightY, { width: metaRightWidth, align: "right" });
      metaRightY += 12;

      y = Math.max(metaLeftBottomY, metaRightY) + 14;

      // Sub-divider
      doc.strokeColor("#F1F5F9").lineWidth(1).moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
      y += 14;

      // ─────────────────────────────────────────────────────────────────
      // 4. PARTIES SECTION (BILLED TO & PAYMENT OVERVIEW)
      // ─────────────────────────────────────────────────────────────────
      const colWidth = (pageWidth - 20) / 2;
      const col2X = startX + colWidth + 20;
      const partiesStartY = y;

      // Customer Column (Left)
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#94A3B8").text("BILLED TO / CUSTOMER:", startX, y);
      y += 12;

      doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#0F172A").text(data.customer.name || "Enterprise Customer", startX, y, { width: colWidth });
      y += 14;

      doc.fontSize(8.5).font("Helvetica").fillColor("#475569");
      if (data.customer.slug) {
        doc.text(`Workspace: @${data.customer.slug}`, startX, y);
        y += 12;
      }
      doc.text(`Billing Email: ${data.customer.email}`, startX, y);
      y += 12;

      if (data.customer.address) {
        doc.text(`Address: ${data.customer.address}`, startX, y, { width: colWidth });
        y += 12;
      }
      if (data.customer.taxId) {
        doc.font("Helvetica-Bold").text(`Tax ID / GSTIN: ${data.customer.taxId}`, startX, y);
        y += 12;
      }

      const customerBottomY = y;

      // Payment Overview Column (Right)
      let payY = partiesStartY;
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#94A3B8").text("PAYMENT & TRANSACTION OVERVIEW:", col2X, payY);
      payY += 12;

      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0F172A").text(`Gateway: ${data.payment.gateway}`, col2X, payY);
      payY += 14;

      doc.fontSize(8.5).font("Helvetica").fillColor("#475569");
      if (data.payment.reference) {
        doc.text(`Transaction Reference: ${data.payment.reference}`, col2X, payY);
        payY += 12;
      }
      doc.text(`Settlement Status: ${data.status}`, col2X, payY);
      payY += 12;

      if (data.verification) {
        doc.text(`Verification: ${data.verification.status}`, col2X, payY);
        payY += 12;
      }

      y = Math.max(customerBottomY, payY) + 16;

      // ─────────────────────────────────────────────────────────────────
      // 5. LINE ITEMS TABLE
      // ─────────────────────────────────────────────────────────────────
      const tableHeaderHeight = 22;
      doc.rect(startX, y, pageWidth, tableHeaderHeight).fill("#F8FAFC");
      doc.rect(startX, y, pageWidth, tableHeaderHeight).strokeColor("#CBD5E1").lineWidth(1).stroke();

      const cDescX = startX + 8;
      const cQtyX = startX + 250;
      const cRateX = startX + 300;
      const cTaxX = startX + 380;
      const cTotalX = startX + pageWidth - 80;

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569");
      doc.text("ITEM & DESCRIPTION", cDescX, y + 6);
      doc.text("QTY", cQtyX, y + 6, { width: 40, align: "right" });
      doc.text("RATE", cRateX, y + 6, { width: 70, align: "right" });
      doc.text("TAX", cTaxX, y + 6, { width: 55, align: "right" });
      doc.text("TOTAL", cTotalX, y + 6, { width: 72, align: "right" });

      y += tableHeaderHeight;

      // Items Rows
      for (const item of data.items) {
        const rowStartY = y;
        const itemCurrency = data.currency;

        doc.fontSize(9).font("Helvetica-Bold").fillColor("#0F172A").text(item.description, cDescX, y + 8, { width: 235 });
        let descHeight = 12;

        if (item.subDescription) {
          doc.fontSize(7.5).font("Helvetica").fillColor("#64748B").text(item.subDescription, cDescX, y + 20, { width: 235 });
          descHeight += 12;
        }

        const rowHeight = Math.max(descHeight + 16, 28);

        doc.fontSize(8.5).font("Helvetica").fillColor("#334155");
        doc.text(String(item.quantity || 1), cQtyX, rowStartY + 8, { width: 40, align: "right" });
        doc.text(formatPdfCurrency(item.unitPrice, itemCurrency), cRateX, rowStartY + 8, { width: 70, align: "right" });
        const lineTotal = item.totalAmount !== undefined && item.totalAmount !== null
          ? item.totalAmount
          : item.amount !== undefined && item.amount !== null
          ? item.amount
          : (item.quantity || 1) * (item.unitPrice || 0);
        doc.font("Helvetica-Bold").text(formatPdfCurrency(lineTotal, itemCurrency), cTotalX, rowStartY + 8, { width: 72, align: "right" });

        y += rowHeight;
        doc.strokeColor("#F1F5F9").lineWidth(0.5).moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
      }

      y += 14;

      // ─────────────────────────────────────────────────────────────────
      // 6. TOTALS FINANCIAL SUMMARY
      // ─────────────────────────────────────────────────────────────────
      const totalsBoxWidth = 240;
      const totalsX = startX + pageWidth - totalsBoxWidth;

      doc.fontSize(8.5).font("Helvetica").fillColor("#64748B");
      doc.text("Subtotal", totalsX, y);
      doc.text(formatPdfCurrency(data.subtotal, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
      y += 14;

      if (data.discount > 0) {
        doc.fillColor("#16A34A").text("Discount", totalsX, y);
        doc.text(`-${formatPdfCurrency(data.discount, data.currency)}`, totalsX, y, { width: totalsBoxWidth, align: "right" });
        y += 14;
      }

      if (data.tax > 0) {
        if (data.taxBreakup?.cgst && data.taxBreakup?.sgst) {
          doc.fillColor("#64748B").text("CGST (9%)", totalsX, y);
          doc.text(formatPdfCurrency(data.taxBreakup.cgst, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
          y += 14;
          doc.text("SGST (9%)", totalsX, y);
          doc.text(formatPdfCurrency(data.taxBreakup.sgst, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
          y += 14;
        } else if (data.taxBreakup?.igst) {
          doc.fillColor("#64748B").text("IGST (18%)", totalsX, y);
          doc.text(formatPdfCurrency(data.taxBreakup.igst, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
          y += 14;
        } else {
          doc.fillColor("#64748B").text("Taxes & Statutory Fees", totalsX, y);
          doc.text(formatPdfCurrency(data.tax, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
          y += 14;
        }
      } else {
        doc.fillColor("#64748B").text("Taxes & Fees", totalsX, y);
        doc.text(formatPdfCurrency(0, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
        y += 14;
      }

      // Grand Total Box
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(totalsX, y).lineTo(startX + pageWidth, y).stroke();
      y += 6;

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#0F172A").text("Total Amount", totalsX, y);
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#EA580C").text(formatPdfCurrency(data.total, data.currency), totalsX, y, { width: totalsBoxWidth, align: "right" });
      y += 24;

      // ─────────────────────────────────────────────────────────────────
      // 7. GATEWAY VERIFICATION DETAILS (IF PRESENT)
      // ─────────────────────────────────────────────────────────────────
      if (data.verification) {
        const vBoxWidth = pageWidth;
        const vBg = data.verification.status === "VERIFIED" ? "#F0FDF4" : data.verification.status === "MISMATCH" ? "#FEF2F2" : "#F8FAFC";
        const vBorder = data.verification.status === "VERIFIED" ? "#BBF7D0" : data.verification.status === "MISMATCH" ? "#FECACA" : "#E2E8F0";
        const vText = data.verification.status === "VERIFIED" ? "#166534" : data.verification.status === "MISMATCH" ? "#991B1B" : "#475569";

        doc.roundedRect(startX, y, vBoxWidth, 26, 4).fill(vBg);
        doc.roundedRect(startX, y, vBoxWidth, 26, 4).strokeColor(vBorder).lineWidth(1).stroke();

        doc.fontSize(8).font("Helvetica-Bold").fillColor(vText);
        doc.text(
          `AUTHORITATIVE PAYMENT VERIFICATION: ${data.verification.status} (${data.verification.summary})  •  Gateway: ${data.verification.provider}  •  Reference: ${data.verification.paymentId || data.payment.reference || "N/A"}`,
          startX + 10,
          y + 8,
          { width: vBoxWidth - 20 }
        );
        y += 32;
      }

      // ─────────────────────────────────────────────────────────────────
      // 8. LEGAL DECLARATION & FOOTER
      // ─────────────────────────────────────────────────────────────────
      const footerY = doc.page.height - doc.page.margins.bottom - 45;
      doc.strokeColor("#E2E8F0").lineWidth(0.5).moveTo(startX, footerY).lineTo(startX + pageWidth, footerY).stroke();

      doc.fontSize(7.5).font("Helvetica").fillColor("#94A3B8");
      const legalNote =
        data.classification === "TAX INVOICE"
          ? "This document is an electronic tax invoice generated under applicable GST laws. No physical signature is required."
          : data.classification === "PAYMENT RECEIPT / TRANSACTION VOUCHER"
          ? "This document is an authoritative payment receipt and ledger voucher confirming electronic settlement of funds. No physical signature is required."
          : data.classification === "PRO FORMA INVOICE"
          ? "This is a pro forma estimate for scheduled subscription provisioning. Tax invoice issued upon payment confirmation."
          : "This is a computer-generated commercial billing statement issued by Master HRMS Cloud. No physical signature is required.";

      doc.text(legalNote, startX, footerY + 8, { width: pageWidth, align: "center" });
      doc.text(`Official support: ${data.supplier.email || "support@masterhrms.com"}  |  Invoice ID: ${data.invoiceNo}  |  Generated from PostgreSQL Ledger`, startX, footerY + 22, {
        width: pageWidth,
        align: "center",
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
