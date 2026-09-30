import { prisma } from "../prisma";
import { assertOpenPeriodForPosting, PeriodPostingError } from "./fiscal-period.service";
export { PeriodPostingError } from "./fiscal-period.service";

// Helper to generate unique journal entry numbers and avoid constraint collisions
async function generateUniqueJournalEntryNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `JE-${year}-${String(count + attempt + 1).padStart(4, "0")}-${rand}`;
    const exists = await prisma.journalEntry.findUnique({
      where: { tenantId_entryNumber: { tenantId, entryNumber: candidate } },
    });
    if (!exists) return candidate;
  }
  return `JE-${year}-${Date.now().toString().slice(-6)}`;
}

// Helper to find or create system chart of account by code
async function getAccountByCode(tenantId: string, code: string, fallbackName: string, type: string, category: string) {
  let acc = await prisma.chartOfAccount.findFirst({
    where: { tenantId, accountCode: code },
  });
  if (!acc) {
    acc = await prisma.chartOfAccount.create({
      data: {
        tenantId,
        accountCode: code,
        accountName: fallbackName,
        accountType: type,
        category,
        isSystem: true,
        balance: 0,
      },
    });
  }
  return acc;
}

/**
 * ⚡ Auto-post POS / Sales Invoice to General Ledger
 * Balanced Double-Entry:
 * - DEBIT: Cash (1010) / Bank (1020) / Accounts Receivable (1030)
 * - CREDIT: Sales Revenue (4010)
 * - CREDIT: Tax Payable (2020) [if tax > 0]
 */
export async function autoPostSaleToLedger(params: {
  tenantId: string;
  saleId: string;
  invoiceNo: string;
  total: number;
  subtotal: number;
  totalTax: number;
  paymentMode?: string;
  isPaid?: boolean;
}) {
  const { tenantId, saleId, invoiceNo, total, subtotal, totalTax, paymentMode = "Cash", isPaid = true } = params;
  if (total <= 0) return;

  try {
    // Avoid double posting
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: saleId },
    });
    if (existing) return;

    let debitAccountCode = "1010"; // Default Cash
    let debitAccountName = "Petty Cash Fund";
    const mode = paymentMode.toLowerCase();

    if (!isPaid) {
      debitAccountCode = "1030";
      debitAccountName = "Accounts Receivable (Debtors)";
    } else if (mode.includes("card") || mode.includes("bank") || mode.includes("upi") || mode.includes("online")) {
      debitAccountCode = "1020";
      debitAccountName = "Primary Operating Bank Account";
    }

    const debitAcc = await getAccountByCode(tenantId, debitAccountCode, debitAccountName, "asset", "current_asset");
    const revenueAcc = await getAccountByCode(tenantId, "4010", "Product Sales Revenue", "revenue", "direct_income");

    const itemsToCreate: any[] = [];
    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    // 1. Debit Asset Account (Cash / Bank / AR)
    itemsToCreate.push({
      accountId: debitAcc.id,
      type: "debit",
      debit: total,
      credit: 0,
      notes: `Receipt / Invoice ${invoiceNo}`,
    });

    // 2. Credit Revenue Account (Net subtotal before tax)
    const revCredit = totalTax > 0 ? subtotal : total;
    itemsToCreate.push({
      accountId: revenueAcc.id,
      type: "credit",
      debit: 0,
      credit: revCredit,
      notes: `Sales revenue for ${invoiceNo}`,
    });

    // 3. Credit Tax Payable if tax applies
    if (totalTax > 0) {
      const taxAcc = await getAccountByCode(tenantId, "2020", "GST / Sales Tax Payable", "liability", "current_liability");
      itemsToCreate.push({
        accountId: taxAcc.id,
        type: "credit",
        debit: 0,
        credit: totalTax,
        notes: `Tax liability for ${invoiceNo}`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: saleId,
          referenceType: "sale",
          description: `Auto-posted Sale / Invoice ${invoiceNo}`,
          totalAmount: total,
          status: "posted",
        },
      });

      for (const item of itemsToCreate) {
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: item.accountId,
            type: item.type,
            debit: item.debit,
            credit: item.credit,
            notes: item.notes,
          },
        });

        // Increment account balance
        const acc = await tx.chartOfAccount.findUnique({ where: { id: item.accountId } });
        if (acc) {
          const delta = acc.accountType === "asset" || acc.accountType === "expense" ? item.debit - item.credit : item.credit - item.debit;
          await tx.chartOfAccount.update({
            where: { id: item.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }
    });

    console.log(`✓ [LEDGER] Auto-posted Journal Entry ${entryNumber} for Sale ${invoiceNo} (Total: ${total})`);
  } catch (err) {
    console.error("Ledger auto-post error for sale:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Payroll Run to General Ledger
 * Balanced Double-Entry:
 * - DEBIT: Salaries & Wages Expense (5010)
 * - CREDIT: Primary Bank Account (1020)
 * - CREDIT: Payroll Deductions Payable (2030) [if deductions > 0]
 */
export async function autoPostPayrollToLedger(params: {
  tenantId: string;
  payrollRunId: string;
  period: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}) {
  const { tenantId, payrollRunId, period, totalGross, totalNet, totalDeductions } = params;
  if (totalGross <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: payrollRunId },
    });
    if (existing) return;

    const salaryExpenseAcc = await getAccountByCode(tenantId, "5010", "Employee Salaries & Wages", "expense", "direct_expense");
    const bankAcc = await getAccountByCode(tenantId, "1020", "Primary Operating Bank Account", "asset", "current_asset");

    const itemsToCreate: any[] = [];
    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    // 1. Debit Salary Expense
    itemsToCreate.push({
      accountId: salaryExpenseAcc.id,
      type: "debit",
      debit: totalGross,
      credit: 0,
      notes: `Gross salary for payroll period ${period}`,
    });

    // 2. Credit Bank Account (Net paid to employees)
    itemsToCreate.push({
      accountId: bankAcc.id,
      type: "credit",
      debit: 0,
      credit: totalNet,
      notes: `Net payroll disbursement for ${period}`,
    });

    // 3. Credit Deductions / Taxes Payable (if any)
    if (totalDeductions > 0) {
      const deductionAcc = await getAccountByCode(tenantId, "2030", "Payroll & Salaries Payable", "liability", "current_liability");
      itemsToCreate.push({
        accountId: deductionAcc.id,
        type: "credit",
        debit: 0,
        credit: totalDeductions,
        notes: `Statutory deductions / PF / ESI / TDS for ${period}`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: payrollRunId,
          referenceType: "payroll",
          description: `Auto-posted Payroll Disbursement for ${period}`,
          totalAmount: totalGross,
          status: "posted",
        },
      });

      for (const item of itemsToCreate) {
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: item.accountId,
            type: item.type,
            debit: item.debit,
            credit: item.credit,
            notes: item.notes,
          },
        });

        const acc = await tx.chartOfAccount.findUnique({ where: { id: item.accountId } });
        if (acc) {
          const delta = acc.accountType === "asset" || acc.accountType === "expense" ? item.debit - item.credit : item.credit - item.debit;
          await tx.chartOfAccount.update({
            where: { id: item.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }
    });

    console.log(`✓ [LEDGER] Auto-posted Journal Entry ${entryNumber} for Payroll ${period} (Gross: ${totalGross})`);
  } catch (err) {
    console.error("Ledger auto-post error for payroll:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Approved / Reimbursed Expense Claim to General Ledger
 * Balanced Double-Entry:
 * - DEBIT: Travel & Employee Reimbursements (5050)
 * - CREDIT: Petty Cash Fund (1010) or Primary Bank (1020)
 */
export async function autoPostExpenseToLedger(params: {
  tenantId: string;
  claimId: string;
  title: string;
  amount: number;
  paymentMode?: string;
}) {
  const { tenantId, claimId, title, amount, paymentMode = "Cash" } = params;
  if (amount <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: claimId },
    });
    if (existing) return;

    const expenseAcc = await getAccountByCode(tenantId, "5050", "Travel & Employee Reimbursements", "expense", "indirect_expense");
    const creditCode = paymentMode.toLowerCase().includes("bank") ? "1020" : "1010";
    const creditName = creditCode === "1020" ? "Primary Operating Bank Account" : "Petty Cash Fund";
    const creditAcc = await getAccountByCode(tenantId, creditCode, creditName, "asset", "current_asset");

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: claimId,
          referenceType: "expense",
          description: `Auto-posted Expense Reimbursement: ${title}`,
          totalAmount: amount,
          status: "posted",
        },
      });

      // Debit Expense
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: expenseAcc.id,
          type: "debit",
          debit: amount,
          credit: 0,
          notes: `Reimbursement for ${title}`,
        },
      });

      // Credit Cash / Bank
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: creditAcc.id,
          type: "credit",
          debit: 0,
          credit: amount,
          notes: `Disbursement for ${title}`,
        },
      });

      // Update balances
      await tx.chartOfAccount.update({
        where: { id: expenseAcc.id },
        data: { balance: { increment: amount } },
      });
      await tx.chartOfAccount.update({
        where: { id: creditAcc.id },
        data: { balance: { decrement: amount } },
      });
    });

    console.log(`✓ [LEDGER] Auto-posted Journal Entry ${entryNumber} for Expense "${title}" (Amount: ${amount})`);
  } catch (err) {
    console.error("Ledger auto-post error for expense:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Purchase Order / Goods Receipt to General Ledger
 * Balanced Double-Entry:
 * - DEBIT: Merchandise Inventory (1040)
 * - CREDIT: Primary Bank (1020) / Petty Cash (1010) [if paid] OR Accounts Payable (2010) [if credit/unpaid]
 */
export async function autoPostPurchaseToLedger(params: {
  tenantId: string;
  purchaseId: string;
  purchaseNo: string;
  total: number;
  isPaid?: boolean;
  paymentMode?: string;
}) {
  const { tenantId, purchaseId, purchaseNo, total, isPaid = false, paymentMode = "Bank Transfer" } = params;
  if (total <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: purchaseId },
    });
    if (existing) return;

    const inventoryAcc = await getAccountByCode(tenantId, "1040", "Merchandise Inventory", "asset", "current_asset");

    let creditCode = "2010"; // Default Accounts Payable
    let creditName = "Accounts Payable (Creditors)";
    let creditType = "liability";
    let creditCat = "current_liability";

    if (isPaid) {
      creditCode = paymentMode.toLowerCase().includes("cash") ? "1010" : "1020";
      creditName = creditCode === "1010" ? "Petty Cash Fund" : "Primary Operating Bank Account";
      creditType = "asset";
      creditCat = "current_asset";
    }

    const creditAcc = await getAccountByCode(tenantId, creditCode, creditName, creditType, creditCat);

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: purchaseId,
          referenceType: "purchase",
          description: `Auto-posted Purchase Order: ${purchaseNo}`,
          totalAmount: total,
          status: "posted",
        },
      });

      // Debit Merchandise Inventory
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: inventoryAcc.id,
          type: "debit",
          debit: total,
          credit: 0,
          notes: `Inventory stock addition for PO ${purchaseNo}`,
        },
      });

      // Credit Accounts Payable or Bank
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: creditAcc.id,
          type: "credit",
          debit: 0,
          credit: total,
          notes: `Payable / Disbursement for PO ${purchaseNo}`,
        },
      });

      // Update balances
      await tx.chartOfAccount.update({
        where: { id: inventoryAcc.id },
        data: { balance: { increment: total } },
      });

      const delta = creditAcc.accountType === "asset" ? -total : total;
      await tx.chartOfAccount.update({
        where: { id: creditAcc.id },
        data: { balance: { increment: delta } },
      });
    });

    console.log(`✓ [LEDGER] Auto-posted Journal Entry ${entryNumber} for Purchase Order ${purchaseNo} (Total: ${total})`);
  } catch (err) {
    console.error("Ledger auto-post error for purchase:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Stock Adjustment to General Ledger
 * Balanced Double-Entry:
 * - If Addition (inventory surplus / physical count gain):
 *   DEBIT: Merchandise Inventory (1040)
 *   CREDIT: Inventory Adjustment Gain / Cost of Goods Sold Recovery (5020)
 * - If Subtraction (shrinkage / damage / spoilage / count deficit):
 *   DEBIT: Inventory Shrinkage & Loss (5020)
 *   CREDIT: Merchandise Inventory (1040)
 */
export async function autoPostStockAdjustmentToLedger(params: {
  tenantId: string;
  adjustmentId: string;
  warehouseName: string;
  type: "addition" | "subtraction";
  totalValue: number;
  reason?: string;
}) {
  const { tenantId, adjustmentId, warehouseName, type, totalValue, reason } = params;
  if (totalValue <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: adjustmentId },
    });
    if (existing) return;

    const inventoryAcc = await getAccountByCode(tenantId, "1040", "Merchandise Inventory", "asset", "current_asset");
    const adjustmentExpenseAcc = await getAccountByCode(
      tenantId,
      "5020",
      "Inventory Shrinkage & Adjustment",
      "expense",
      "cost_of_sales"
    );

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: adjustmentId,
          referenceType: "adjustment",
          description: `Stock Adjustment (${type.toUpperCase()}) in ${warehouseName}: ${reason || "Audit reconciliation"}`,
          totalAmount: totalValue,
          status: "posted",
        },
      });

      if (type === "addition") {
        // Surplus: Debit Inventory, Credit Adjustment Gain
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: inventoryAcc.id,
            type: "debit",
            debit: totalValue,
            credit: 0,
            notes: `Inventory asset addition (${warehouseName})`,
          },
        });
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: adjustmentExpenseAcc.id,
            type: "credit",
            debit: 0,
            credit: totalValue,
            notes: `Inventory surplus reconciliation (${warehouseName})`,
          },
        });

        await tx.chartOfAccount.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: totalValue } },
        });
        await tx.chartOfAccount.update({
          where: { id: adjustmentExpenseAcc.id },
          data: { balance: { decrement: totalValue } },
        });
      } else {
        // Deficit: Debit Expense (Shrinkage/Loss), Credit Inventory Asset
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: adjustmentExpenseAcc.id,
            type: "debit",
            debit: totalValue,
            credit: 0,
            notes: `Inventory shrinkage/damage write-off (${warehouseName})`,
          },
        });
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: inventoryAcc.id,
            type: "credit",
            debit: 0,
            credit: totalValue,
            notes: `Inventory asset reduction (${warehouseName})`,
          },
        });

        await tx.chartOfAccount.update({
          where: { id: adjustmentExpenseAcc.id },
          data: { balance: { increment: totalValue } },
        });
        await tx.chartOfAccount.update({
          where: { id: inventoryAcc.id },
          data: { balance: { decrement: totalValue } },
        });
      }
    });

    console.log(
      `✓ [LEDGER] Auto-posted Journal Entry ${entryNumber} for Stock Adjustment ${adjustmentId} (Valuation: ${totalValue})`
    );
  } catch (err) {
    console.error("Ledger auto-post error for stock adjustment:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}


/**
 * ⚡ Auto-post Supplier Payment (AP Settlement) to General Ledger
 * Balanced Double-Entry:
 * - DEBIT:  Accounts Payable (2010) — clears the liability created at goods receipt
 * - CREDIT: Primary Bank Account (1020) / Petty Cash (1010) / based on method
 *
 * Reference uses `pay-<paymentId>` so it is distinct from the goods-receipt
 * journal entry (which uses the purchaseId directly). This prevents idempotency
 * collisions when both entries exist for the same PO.
 */
export async function autoPostSupplierPaymentToLedger(params: {
  tenantId: string;
  paymentId: string;
  purchaseNo: string;
  amount: number;
  method?: string;
}) {
  const { tenantId, paymentId, purchaseNo, amount, method = "Bank Transfer" } = params;
  if (amount <= 0) return;

  try {
    const reference = `pay-${paymentId}`;

    // Idempotency guard — never double-post the same payment
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference },
    });
    if (existing) return;

    // Debit: Accounts Payable (liability decreases → debit)
    const apAcc = await getAccountByCode(
      tenantId,
      "2010",
      "Accounts Payable (Creditors)",
      "liability",
      "current_liability"
    );

    // Credit: Bank or Cash (asset decreases → credit)
    const mode = (method || "").toLowerCase();
    const creditCode = mode.includes("cash") ? "1010" : "1020";
    const creditName =
      creditCode === "1010" ? "Petty Cash Fund" : "Primary Operating Bank Account";
    const creditAcc = await getAccountByCode(tenantId, creditCode, creditName, "asset", "current_asset");

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference,
          referenceType: "purchase_payment",
          description: `AP Settlement: Supplier payment for PO ${purchaseNo}`,
          totalAmount: amount,
          status: "posted",
        },
      });

      // Debit AP (reduces liability)
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: apAcc.id,
          type: "debit",
          debit: amount,
          credit: 0,
          notes: `AP settlement for PO ${purchaseNo}`,
        },
      });

      // Credit Bank / Cash (reduces asset)
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: creditAcc.id,
          type: "credit",
          debit: 0,
          credit: amount,
          notes: `Supplier disbursement for PO ${purchaseNo} (${method})`,
        },
      });

      // Update account balances
      // AP is a liability: debit reduces it → decrement balance
      await tx.chartOfAccount.update({
        where: { id: apAcc.id },
        data: { balance: { decrement: amount } },
      });
      // Bank/Cash is an asset: credit reduces it → decrement balance
      await tx.chartOfAccount.update({
        where: { id: creditAcc.id },
        data: { balance: { decrement: amount } },
      });
    });

    console.log(
      `✓ [LEDGER] AP Settlement posted: JE ${entryNumber} for Payment ${paymentId} on PO ${purchaseNo} (${amount})`
    );
  } catch (err) {
    console.error("Ledger auto-post error for supplier payment:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Customer Payment Settlement to General Ledger (Accounts Receivable clearance)
 * Balanced Double-Entry:
 * - DEBIT:  Bank Account (1020) / Petty Cash Fund (1010) [increases asset]
 * - CREDIT: Accounts Receivable (Debtors) (1030) [reduces asset]
 */
export async function autoPostCustomerPaymentToLedger(params: {
  tenantId: string;
  paymentId: string;
  saleId: string;
  invoiceNo: string;
  amount: number;
  method?: string;
  customerName?: string;
}) {
  const { tenantId, paymentId, saleId, invoiceNo, amount, method, customerName } = params;
  if (!amount || amount <= 0) return;

  try {
    const reference = `pay-sale-${paymentId}`;
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference },
    });
    if (existing) return;

    // Accounts Receivable account
    const arAcc = await getAccountByCode(
      tenantId,
      "1030",
      "Accounts Receivable (Debtors)",
      "asset",
      "current_asset"
    );

    // Debit Bank or Cash based on payment method
    const mode = (method || "").toLowerCase();
    const debitCode = mode.includes("cash") ? "1010" : "1020";
    const debitName =
      debitCode === "1010" ? "Petty Cash Fund" : "Primary Operating Bank Account";
    const debitAcc = await getAccountByCode(tenantId, debitCode, debitName, "asset", "current_asset");

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference,
          referenceType: "sale_payment",
          description: `AR Settlement: Customer payment for Sale/Invoice ${invoiceNo}${customerName ? ` (${customerName})` : ""}`,
          totalAmount: amount,
          status: "posted",
        },
      });

      // Debit Bank / Cash (increases asset)
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: debitAcc.id,
          type: "debit",
          debit: amount,
          credit: 0,
          notes: `Customer payment received for ${invoiceNo} via ${method || "Cash"}`,
        },
      });

      // Credit AR (reduces asset)
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: arAcc.id,
          type: "credit",
          debit: 0,
          credit: amount,
          notes: `AR clearance for ${invoiceNo}`,
        },
      });

      // Update account balances
      // Bank/Cash is an asset: debit increases it → increment balance
      await tx.chartOfAccount.update({
        where: { id: debitAcc.id },
        data: { balance: { increment: amount } },
      });
      // AR is an asset: credit reduces it → decrement balance
      await tx.chartOfAccount.update({
        where: { id: arAcc.id },
        data: { balance: { decrement: amount } },
      });
    });

    console.log(
      `✓ [LEDGER] AR Settlement posted: JE ${entryNumber} for Customer Payment ${paymentId} on Sale ${invoiceNo} (${amount})`
    );
  } catch (err) {
    console.error("Ledger auto-post error for customer payment:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Sales Return (Credit Note) to General Ledger
 * DEBIT:  Sales Returns & Allowances (4020) — contra-revenue
 * DEBIT:  Tax Payable (2020)                — tax reversal [if tax > 0]
 * CREDIT: Cash/Bank/AR                      — refund / credit to customer
 */
export async function autoPostSalesReturnToLedger(params: {
  tenantId: string;
  returnId: string;
  returnNumber: string;
  totalAmount: number;
  taxAmount: number;
  originalPaymentMode?: string;
}) {
  const { tenantId, returnId, returnNumber, totalAmount, taxAmount, originalPaymentMode = "Cash" } = params;
  if (totalAmount <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({ where: { tenantId, reference: returnId } });
    if (existing) return;

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);
    const subtotalAmount = totalAmount - taxAmount;
    const mode = originalPaymentMode.toLowerCase();

    let creditCode = "1010"; let creditName = "Petty Cash Fund";
    if (mode.includes("card") || mode.includes("bank") || mode.includes("upi") || mode.includes("online")) {
      creditCode = "1020"; creditName = "Primary Operating Bank Account";
    } else if (mode.includes("credit") || mode.includes("ar") || mode.includes("receivable")) {
      creditCode = "1030"; creditName = "Accounts Receivable (Debtors)";
    }

    const returnsAcc = await getAccountByCode(tenantId, "4020", "Sales Returns & Allowances", "revenue", "operating_revenue");
    const creditAcc  = await getAccountByCode(tenantId, creditCode, creditName, "asset", "current_asset");
    const taxAcc     = taxAmount > 0 ? await getAccountByCode(tenantId, "2020", "GST / Tax Payable", "liability", "current_liability") : null;

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: { tenantId, entryNumber, reference: returnId, description: `Sales Return ${returnNumber}`, entryDate: new Date(), status: "posted" },
      });
      await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: returnsAcc.id, type: "debit", debit: subtotalAmount, credit: 0, notes: `Revenue reversal for return ${returnNumber}` } });
      // 4020 is a revenue account (credit normal balance): a debit on it decreases the balance → decrement
      await tx.chartOfAccount.update({ where: { id: returnsAcc.id }, data: { balance: { decrement: subtotalAmount } } });

      if (taxAmount > 0 && taxAcc) {
        await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: taxAcc.id, type: "debit", debit: taxAmount, credit: 0, notes: `Tax reversal for return ${returnNumber}` } });
        await tx.chartOfAccount.update({ where: { id: taxAcc.id }, data: { balance: { decrement: taxAmount } } });
      }

      await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: creditAcc.id, type: "credit", debit: 0, credit: totalAmount, notes: `Credit/refund issued for return ${returnNumber}` } });
      await tx.chartOfAccount.update({ where: { id: creditAcc.id }, data: { balance: { decrement: totalAmount } } });
    });

    console.log(`✓ [LEDGER] Sales Return posted: JE ${entryNumber} for ${returnNumber} (${totalAmount})`);
  } catch (err) {
    console.error("Ledger auto-post error for sales return:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

/**
 * ⚡ Auto-post Purchase Return (Debit Note) to General Ledger
 * DEBIT:  Accounts Payable (2010)              — reduces AP (owe supplier less)
 * CREDIT: Purchase Returns & Allowances (5020) — contra-expense
 * CREDIT: GST Input Tax Credit (1040)          — reverses input credit [if tax > 0]
 */
export async function autoPostPurchaseReturnToLedger(params: {
  tenantId: string;
  returnId: string;
  returnNumber: string;
  totalAmount: number;
  taxAmount: number;
}) {
  const { tenantId, returnId, returnNumber, totalAmount, taxAmount } = params;
  if (totalAmount <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({ where: { tenantId, reference: returnId } });
    if (existing) return;

    const entryNumber = await generateUniqueJournalEntryNumber(tenantId);
    const subtotalAmount = totalAmount - taxAmount;

    const apAcc       = await getAccountByCode(tenantId, "2010", "Accounts Payable (Creditors)", "liability", "current_liability");
    const purchRetAcc = await getAccountByCode(tenantId, "5020", "Purchase Returns & Allowances", "expense", "cost_of_goods_sold");
    const taxInputAcc = taxAmount > 0 ? await getAccountByCode(tenantId, "1040", "GST Input Tax Credit", "asset", "current_asset") : null;

    await prisma.$transaction(async (tx) => {
      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: { tenantId, entryNumber, reference: returnId, description: `Purchase Return ${returnNumber}`, entryDate: new Date(), status: "posted" },
      });
      await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: apAcc.id, type: "debit", debit: totalAmount, credit: 0, notes: `AP reduction for purchase return ${returnNumber}` } });
      await tx.chartOfAccount.update({ where: { id: apAcc.id }, data: { balance: { decrement: totalAmount } } });

      await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: purchRetAcc.id, type: "credit", debit: 0, credit: subtotalAmount, notes: `Expense reversal for purchase return ${returnNumber}` } });
      await tx.chartOfAccount.update({ where: { id: purchRetAcc.id }, data: { balance: { decrement: subtotalAmount } } });

      if (taxAmount > 0 && taxInputAcc) {
        await tx.journalItem.create({ data: { journalEntryId: entry.id, accountId: taxInputAcc.id, type: "credit", debit: 0, credit: taxAmount, notes: `Input tax reversal for purchase return ${returnNumber}` } });
        await tx.chartOfAccount.update({ where: { id: taxInputAcc.id }, data: { balance: { decrement: taxAmount } } });
      }
    });

    console.log(`✓ [LEDGER] Purchase Return posted: JE ${entryNumber} for ${returnNumber} (${totalAmount})`);
  } catch (err) {
    console.error("Ledger auto-post error for purchase return:", err);
    if (err instanceof PeriodPostingError) throw err;
  }
}

