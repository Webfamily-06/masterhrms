import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export interface RecurrenceResult {
  scheduleId: string;
  recurringInvoiceNo: string;
  generatedSaleId?: string;
  invoiceNo?: string;
  success: boolean;
  status: string;
  error?: string;
}

/**
 * Calculates the next billing date based on recurrence frequency.
 */
export function calculateNextBillingDate(baseDate: Date, cycle: string): Date {
  const next = new Date(baseDate);
  const normalized = (cycle || "").trim().toLowerCase();

  switch (normalized) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "monthly":
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

/**
 * Generates a formal invoice (Sale) from an active RecurringInvoice schedule.
 * Implements strict idempotency to prevent duplicate generation for the same billing cycle date.
 */
export async function generateInvoiceFromRecurringSchedule(
  scheduleId: string,
  tenantId: string,
  options: { force?: boolean } = {}
): Promise<RecurrenceResult> {
  const schedule = await prisma.recurringInvoice.findFirst({
    where: { id: scheduleId, tenantId },
    include: { items: true, customer: true },
  });

  if (!schedule) {
    return {
      scheduleId,
      recurringInvoiceNo: "UNKNOWN",
      success: false,
      status: "not_found",
      error: "Recurring invoice schedule not found",
    };
  }

  // Only active schedules can generate invoices unless manually forced
  if (schedule.status !== "Active" && !options.force) {
    return {
      scheduleId,
      recurringInvoiceNo: schedule.recurringInvoiceNo,
      success: false,
      status: schedule.status,
      error: `Cannot generate invoice for schedule in '${schedule.status}' status.`,
    };
  }

  const now = new Date();
  const issueDate = schedule.nextIssueDate || now;
  const cycleDateKey = issueDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const cleanRiCode = schedule.recurringInvoiceNo.replace(/[^A-Za-z0-9]/g, "");
  const targetInvoiceNo = `INV-${cleanRiCode}-${cycleDateKey.replace(/-/g, "")}`;

  // Check recurrence end date
  if (schedule.endDate && issueDate > schedule.endDate && !options.force) {
    await prisma.recurringInvoice.update({
      where: { id: schedule.id },
      data: { status: "Completed" },
    });
    return {
      scheduleId,
      recurringInvoiceNo: schedule.recurringInvoiceNo,
      success: false,
      status: "Completed",
      error: "Recurrence period has ended. Marked schedule as Completed.",
    };
  }

  // Idempotency check: verify if an invoice was already generated for this schedule + cycle
  const existingSale = await prisma.sale.findFirst({
    where: {
      tenantId,
      OR: [
        { invoiceNo: targetInvoiceNo },
        { notes: { contains: `[RecurringRef:${schedule.id}:${cycleDateKey}]` } },
      ],
    },
  });

  if (existingSale) {
    // Advance nextIssueDate if it is stuck on past date
    const nextIssue = calculateNextBillingDate(schedule.nextIssueDate, schedule.cycle);
    await prisma.recurringInvoice.update({
      where: { id: schedule.id },
      data: {
        nextIssueDate: nextIssue,
        status: schedule.endDate && nextIssue > schedule.endDate ? "Completed" : schedule.status,
      },
    });

    return {
      scheduleId,
      recurringInvoiceNo: schedule.recurringInvoiceNo,
      generatedSaleId: existingSale.id,
      invoiceNo: existingSale.invoiceNo,
      success: true,
      status: "already_generated",
      error: `Invoice ${existingSale.invoiceNo} already generated for cycle ${cycleDateKey}. Advanced to next date.`,
    };
  }

  // Calculate invoice dates
  const invoiceDate = new Date(issueDate);
  const dueDate = schedule.dueDate
    ? new Date(schedule.dueDate)
    : new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000); // Default 15 days payment terms

  const subtotal = new Prisma.Decimal(schedule.subtotal.toString());
  const taxAmount = new Prisma.Decimal(schedule.taxAmount.toString());
  const discountAmount = new Prisma.Decimal(schedule.discountAmount.toString());
  const totalAmount = new Prisma.Decimal(schedule.totalAmount.toString());

  // Determine tax split
  const cgst = taxAmount.dividedBy(2).toDecimalPlaces(2);
  const sgst = taxAmount.minus(cgst);
  const igst = new Prisma.Decimal(0);

  const idempotencyNote = `[RecurringRef:${schedule.id}:${cycleDateKey}]`;
  const saleNotes = [
    `Recurring Invoice for ${schedule.customerName} (${schedule.cycle}). Generated from schedule ${schedule.recurringInvoiceNo}.`,
    idempotencyNote,
    schedule.notes || "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Sale entry
    const createdSale = await tx.sale.create({
      data: {
        tenantId,
        invoiceNo: targetInvoiceNo,
        type: "recurring_generated",
        customerId: schedule.customerId,
        customerName: schedule.customerName,
        customerGstin: schedule.customer?.gstin || null,
        subtotal: subtotal.toNumber(),
        cgst: cgst.toNumber(),
        sgst: sgst.toNumber(),
        igst: igst.toNumber(),
        totalTax: taxAmount.toNumber(),
        discountAmt: discountAmount.toNumber(),
        total: totalAmount.toNumber(),
        paidAmount: 0,
        paymentStatus: "unpaid",
        notes: saleNotes,
        date: invoiceDate,
        dueDate,
      },
    });

    // 2. Create Sale Details (items)
    for (const item of schedule.items) {
      const itemName = item.description || "Recurring Service / Product";

      let prod = await tx.product.findFirst({
        where: { tenantId, name: itemName },
      });

      if (!prod) {
        prod = await tx.product.create({
          data: {
            tenantId,
            name: itemName,
            sku: `REC-${cleanRiCode}-${Math.floor(1000 + Math.random() * 9000)}`,
            purchasePrice: 0,
            salePrice: Number(item.unitPrice),
            lowStockThreshold: 0,
          },
        });
      }

      const itemQty = item.quantity || 1;
      const itemPrice = new Prisma.Decimal(item.unitPrice.toString());
      const itemDiscount = new Prisma.Decimal(item.discount.toString());
      const itemSubtotal = new Prisma.Decimal(item.amount.toString());

      await tx.saleDetail.create({
        data: {
          saleId: createdSale.id,
          productId: prod.id,
          productName: itemName,
          sku: prod.sku,
          unit: "Pcs",
          price: itemPrice.toNumber(),
          quantity: itemQty,
          discount: itemDiscount.toNumber(),
          subtotal: itemSubtotal.toNumber(),
        },
      });
    }

    // 3. Advance schedule nextIssueDate and counter
    const nextDate = calculateNextBillingDate(schedule.nextIssueDate, schedule.cycle);
    const isCompleted = schedule.endDate ? nextDate > schedule.endDate : false;

    const updatedSchedule = await tx.recurringInvoice.update({
      where: { id: schedule.id },
      data: {
        lastIssueDate: now,
        nextIssueDate: nextDate,
        issuesSentCount: { increment: 1 },
        status: isCompleted ? "Completed" : schedule.status,
      },
    });

    return { createdSale, updatedSchedule };
  });

  return {
    scheduleId: schedule.id,
    recurringInvoiceNo: schedule.recurringInvoiceNo,
    generatedSaleId: result.createdSale.id,
    invoiceNo: result.createdSale.invoiceNo,
    success: true,
    status: "generated",
  };
}

/**
 * Scans for all active recurring invoices where nextIssueDate <= now.
 * Generates due invoices and advances dates.
 */
export async function processDueRecurringInvoices(tenantId?: string) {
  const now = new Date();
  const whereClause: any = {
    status: "Active",
    nextIssueDate: { lte: now },
  };
  if (tenantId) {
    whereClause.tenantId = tenantId;
  }

  const dueSchedules = await prisma.recurringInvoice.findMany({
    where: whereClause,
    take: 50, // Batch limit
  });

  const results: RecurrenceResult[] = [];
  for (const schedule of dueSchedules) {
    try {
      const res = await generateInvoiceFromRecurringSchedule(schedule.id, schedule.tenantId);
      results.push(res);
    } catch (err: any) {
      results.push({
        scheduleId: schedule.id,
        recurringInvoiceNo: schedule.recurringInvoiceNo,
        success: false,
        status: "error",
        error: err.message || "Failed to generate recurring invoice",
      });
    }
  }

  const generatedCount = results.filter((r) => r.status === "generated").length;
  const alreadyGeneratedCount = results.filter((r) => r.status === "already_generated").length;
  const errorCount = results.filter((r) => !r.success).length;

  return {
    scannedCount: dueSchedules.length,
    generatedCount,
    alreadyGeneratedCount,
    errorCount,
    results,
  };
}
