import { prisma } from "../prisma";

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
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

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
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

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

    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    await prisma.$transaction(async (tx) => {
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

    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    await prisma.$transaction(async (tx) => {
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

    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    await prisma.$transaction(async (tx) => {
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
  }
}


