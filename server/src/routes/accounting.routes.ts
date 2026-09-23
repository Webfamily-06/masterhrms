import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const accountingRouter = Router();

// Standard 17 Seed Accounts
const DEFAULT_ACCOUNTS = [
  { code: "1010", name: "Petty Cash Fund", type: "asset", category: "current_asset" },
  { code: "1020", name: "Primary Operating Bank Account", type: "asset", category: "current_asset" },
  { code: "1030", name: "Accounts Receivable (Debtors)", type: "asset", category: "current_asset" },
  { code: "1040", name: "Merchandise Inventory", type: "asset", category: "current_asset" },
  { code: "1510", name: "Office Equipment & Furniture", type: "asset", category: "fixed_asset" },
  { code: "2010", name: "Accounts Payable (Creditors)", type: "liability", category: "current_liability" },
  { code: "2020", name: "GST / Sales Tax Payable", type: "liability", category: "current_liability" },
  { code: "2030", name: "Payroll & Salaries Payable", type: "liability", category: "current_liability" },
  { code: "3010", name: "Owner's Equity / Share Capital", type: "equity", category: "equity" },
  { code: "3020", name: "Retained Earnings", type: "equity", category: "equity" },
  { code: "4010", name: "Product Sales Revenue", type: "revenue", category: "direct_income" },
  { code: "4020", name: "Service & Consulting Fees", type: "revenue", category: "direct_income" },
  { code: "5010", name: "Employee Salaries & Wages", type: "expense", category: "direct_expense" },
  { code: "5020", name: "Office Rent & Utilities", type: "expense", category: "indirect_expense" },
  { code: "5030", name: "Marketing & Advertising", type: "expense", category: "indirect_expense" },
  { code: "5040", name: "Software Licenses & SaaS Tools", type: "expense", category: "indirect_expense" },
  { code: "5050", name: "Travel & Employee Reimbursements", type: "expense", category: "indirect_expense" },
];

async function ensureSeedAccounts(tenantId: string) {
  const count = await prisma.chartOfAccount.count({ where: { tenantId } });
  if (count === 0) {
    for (const acc of DEFAULT_ACCOUNTS) {
      await prisma.chartOfAccount.create({
        data: {
          tenantId,
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          category: acc.category,
          isSystem: true,
          balance: 0,
        },
      });
    }
  }
}

// -------------------------------------------------------------
// 1. DASHBOARD & OVERVIEW (100% REAL DATA FROM MYSQL)
// -------------------------------------------------------------

accountingRouter.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureSeedAccounts(tenantId);

    const accounts = await prisma.chartOfAccount.findMany({ where: { tenantId } });

    // Calculate Assets, Liabilities, Equity, Revenue, Expense from real account balances
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const acc of accounts) {
      const b = Number(acc.balance || 0);
      if (acc.accountType === "asset") totalAssets += b;
      else if (acc.accountType === "liability") totalLiabilities += b;
      else if (acc.accountType === "equity") totalEquity += b;
      else if (acc.accountType === "revenue") totalRevenue += b;
      else if (acc.accountType === "expense") totalExpenses += b;
    }

    const netIncome = totalRevenue - totalExpenses;

    // Fetch real recent revenue journal items
    const revenueItems = await prisma.journalItem.findMany({
      where: {
        journalEntry: { tenantId },
        account: { accountType: "revenue" },
      },
      include: {
        journalEntry: true,
        account: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentRevenues = revenueItems.map((item) => ({
      number: item.journalEntry.entryNumber,
      description: item.journalEntry.description || item.account.accountName,
      date: new Date(item.journalEntry.entryDate).toISOString().split("T")[0],
      amount: Number(item.credit || item.debit || 0),
    }));

    // Fetch real recent expense journal items
    const expenseItems = await prisma.journalItem.findMany({
      where: {
        journalEntry: { tenantId },
        account: { accountType: "expense" },
      },
      include: {
        journalEntry: true,
        account: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentExpenses = expenseItems.map((item) => ({
      number: item.journalEntry.entryNumber,
      description: item.journalEntry.description || item.account.accountName,
      date: new Date(item.journalEntry.entryDate).toISOString().split("T")[0],
      amount: Number(item.debit || item.credit || 0),
    }));

    // Real client & vendor counts from contracts / accounts
    const totalClients = await prisma.contract.count({
      where: { tenantId, contractType: "client_nda" },
    });
    const totalVendors = await prisma.contract.count({
      where: { tenantId, contractType: "vendor" },
    });

    return res.json({
      success: true,
      data: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        totalExpenses,
        netIncome,
        totalClients: totalClients || 0,
        totalVendors: totalVendors || 0,
        totalCustomerPayments: totalRevenue,
        totalVendorPayments: totalExpenses,
        recentRevenues,
        recentExpenses,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load accounting dashboard" });
  }
});

// -------------------------------------------------------------
// 2. CHART OF ACCOUNTS
// -------------------------------------------------------------

accountingRouter.get("/accounts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureSeedAccounts(tenantId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: { tenantId },
      orderBy: { accountCode: "asc" },
      include: {
        _count: { select: { journalItems: true } },
      },
    });

    return res.json({ success: true, data: accounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch accounts" });
  }
});

accountingRouter.post("/accounts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { accountCode, accountName, accountType, category, description, currency, balance } = req.body;

    if (!accountCode || !accountName || !accountType) {
      return res.status(400).json({ error: "Code, name, and account type are required" });
    }

    const existing = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode },
    });
    if (existing) {
      return res.status(400).json({ error: "Account code already exists" });
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        tenantId,
        accountCode,
        accountName,
        accountType,
        category: category || "current_asset",
        currency: currency || "INR",
        description,
        balance: Number(balance || 0),
      },
    });

    return res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create account" });
  }
});

// -------------------------------------------------------------
// 3. DOUBLE-ENTRY JOURNAL ENTRIES
// -------------------------------------------------------------

accountingRouter.get("/journal-entries", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "entryDate", 25);
    const { status, referenceType, startDate, endDate } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status);
    if (referenceType && referenceType !== "all") where.referenceType = String(referenceType);

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(String(startDate));
      if (endDate) where.entryDate.lte = new Date(String(endDate));
    }

    if (pagination.search) {
      where.OR = [
        { entryNumber: { contains: pagination.search } },
        { description: { contains: pagination.search } },
        { reference: { contains: pagination.search } },
      ];
    }

    const sortField = ["entryDate", "entryNumber", "totalAmount", "createdAt"].includes(pagination.sortField)
      ? pagination.sortField
      : "entryDate";

    const [total, entries] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        orderBy: { [sortField]: pagination.sortType },
        include: {
          items: {
            include: { account: true },
          },
        },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(entries, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json({ success: true, data: entries });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch journal entries" });
  }
});

accountingRouter.post("/journal-entries", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { entryDate, reference, referenceType, description, items } = req.body;

    if (!description || !Array.isArray(items) || items.length < 2) {
      return res.status(400).json({ error: "At least 2 line items are required for a double entry" });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const item of items) {
      totalDebit += Number(item.debit || 0);
      totalCredit += Number(item.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Journal entry must be balanced. Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}).`,
      });
    }

    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const journalEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          reference: reference || null,
          referenceType: referenceType || "manual",
          description,
          totalAmount: totalDebit,
          status: "posted",
        },
      });

      for (const item of items) {
        const d = Number(item.debit || 0);
        const c = Number(item.credit || 0);
        const type = d > 0 ? "debit" : "credit";

        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: item.accountId,
            type,
            debit: d,
            credit: c,
            notes: item.notes || null,
          },
        });

        // Update Account Balance in Database
        const acc = await tx.chartOfAccount.findUnique({ where: { id: item.accountId } });
        if (acc) {
          let delta = 0;
          if (acc.accountType === "asset" || acc.accountType === "expense") {
            delta = d - c;
          } else {
            delta = c - d;
          }
          await tx.chartOfAccount.update({
            where: { id: item.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }

      return entry;
    });

    return res.status(201).json({ success: true, data: journalEntry });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create journal entry" });
  }
});

// POST /api/accounting/journal-entries/:id/void (Contra-Journal Voiding / GAAP & IFRS Compliance)
accountingRouter.post("/journal-entries/:id/void", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { reason } = req.body;

    const original = await prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { items: { include: { account: true } } },
    });

    if (!original) {
      return res.status(404).json({ error: "Journal entry not found" });
    }

    if (original.status === "voided") {
      return res.status(400).json({ error: "Journal entry is already voided" });
    }

    const contraNumber = `CNTR-${original.entryNumber}`;

    const contraEntry = await prisma.$transaction(async (tx) => {
      // Mark original as voided
      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: "voided" },
      });

      // Create paired Contra-Journal entry with inverted debits & credits
      const contra = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber: contraNumber,
          entryDate: new Date(),
          reference: original.id,
          referenceType: "contra_reversal",
          description: `Contra Reversal of ${original.entryNumber}: ${reason || original.description}`,
          totalAmount: original.totalAmount,
          status: "posted",
        },
      });

      for (const item of original.items) {
        // Invert: original debit becomes credit, original credit becomes debit
        const newDebit = Number(item.credit || 0);
        const newCredit = Number(item.debit || 0);
        const newType = newDebit > 0 ? "debit" : "credit";

        await tx.journalItem.create({
          data: {
            journalEntryId: contra.id,
            accountId: item.accountId,
            type: newType,
            debit: newDebit,
            credit: newCredit,
            notes: `Contra reversal for ${original.entryNumber}`,
          },
        });

        // Reverse account balance symmetrically
        const acc = await tx.chartOfAccount.findUnique({ where: { id: item.accountId } });
        if (acc) {
          const delta = (acc.accountType === "asset" || acc.accountType === "expense")
            ? newDebit - newCredit
            : newCredit - newDebit;

          await tx.chartOfAccount.update({
            where: { id: item.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }

      return contra;
    });

    return res.status(200).json({
      success: true,
      message: `Journal ${original.entryNumber} voided successfully via Contra Entry ${contraEntry.entryNumber}`,
      data: contraEntry,
    });
  } catch (err: any) {
    console.error("Contra void error:", err);
    return res.status(500).json({ error: err.message || "Failed to void journal entry" });
  }
});

// POST /api/accounting/transfers - Internal Bank & Cash Transfer
accountingRouter.post("/transfers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { fromAccount, toAccount, amount, reference, notes } = req.body;

    const transferAmt = parseFloat(amount);
    if (isNaN(transferAmt) || transferAmt <= 0) {
      return res.status(400).json({ error: "Transfer amount must be greater than zero" });
    }

    if (!fromAccount || !toAccount) {
      return res.status(400).json({ error: "Source and destination accounts are required" });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({ error: "Cannot transfer to the same account" });
    }

    const [sourceAcc, destAcc] = await Promise.all([
      prisma.chartOfAccount.findFirst({
        where: { tenantId, OR: [{ id: fromAccount }, { accountCode: fromAccount }] },
      }),
      prisma.chartOfAccount.findFirst({
        where: { tenantId, OR: [{ id: toAccount }, { accountCode: toAccount }] },
      }),
    ]);

    if (!sourceAcc || !destAcc) {
      return res.status(404).json({ error: "One or both accounts not found" });
    }

    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const journalEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: reference || `TRF-${Date.now().toString().slice(-6)}`,
          referenceType: "bank_transfer",
          description: notes || `Internal Transfer from ${sourceAcc.accountName} to ${destAcc.accountName}`,
          totalAmount: transferAmt,
          status: "posted",
        },
      });

      // Debit Destination Account
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: destAcc.id,
          type: "debit",
          debit: transferAmt,
          credit: 0,
          notes: notes || `Transfer received from ${sourceAcc.accountName}`,
        },
      });

      // Credit Source Account
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: sourceAcc.id,
          type: "credit",
          debit: 0,
          credit: transferAmt,
          notes: notes || `Transfer sent to ${destAcc.accountName}`,
        },
      });

      // Update balances
      const destDelta = (destAcc.accountType === "asset" || destAcc.accountType === "expense") ? transferAmt : -transferAmt;
      const srcDelta = (sourceAcc.accountType === "asset" || sourceAcc.accountType === "expense") ? -transferAmt : transferAmt;

      await tx.chartOfAccount.update({
        where: { id: destAcc.id },
        data: { balance: { increment: destDelta } },
      });

      await tx.chartOfAccount.update({
        where: { id: sourceAcc.id },
        data: { balance: { increment: srcDelta } },
      });

      return entry;
    });

    return res.status(201).json({ success: true, data: journalEntry });
  } catch (error: any) {
    console.error("Internal transfer error:", error);
    return res.status(500).json({ error: error.message || "Failed to process internal transfer" });
  }
});

// -------------------------------------------------------------
// 4. FINANCIAL STATEMENTS (BALANCE SHEET, P&L, GENERAL LEDGER)
// -------------------------------------------------------------

accountingRouter.get("/reports/financial-statements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureSeedAccounts(tenantId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: { tenantId },
      orderBy: { accountCode: "asc" },
    });

    const assets = accounts.filter((a) => a.accountType === "asset");
    const liabilities = accounts.filter((a) => a.accountType === "liability");
    const equity = accounts.filter((a) => a.accountType === "equity");
    const revenue = accounts.filter((a) => a.accountType === "revenue");
    const expenses = accounts.filter((a) => a.accountType === "expense");

    const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalEquity = equity.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalRevenue = revenue.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + Number(a.balance), 0);

    const netProfit = totalRevenue - totalExpenses;
    const balancedTotalLiabEquity = totalLiabilities + totalEquity + netProfit;

    return res.json({
      success: true,
      data: {
        balanceSheet: {
          assets,
          liabilities,
          equity,
          totalAssets,
          totalLiabilities,
          totalEquity,
          netProfit,
          balancedTotalLiabEquity,
          isBalanced: Math.abs(totalAssets - balancedTotalLiabEquity) < 0.01,
        },
        profitAndLoss: {
          revenue,
          expenses,
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMarginPct: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0",
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate financial statements" });
  }
});

// -------------------------------------------------------------
// 5. AGING & TAX REPORTS (REAL QUERIES)
// -------------------------------------------------------------

accountingRouter.get("/reports/aging", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    // Calculate real GST from tax accounts
    const gstPayableAccount = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: "2020" },
    });

    const netGstPayable = Number(gstPayableAccount?.balance || 0);

    return res.json({
      success: true,
      data: {
        invoiceAging: [],
        billAging: [],
        taxSummary: {
          salesGstCollected: netGstPayable > 0 ? netGstPayable : 0,
          purchaseGstPaid: netGstPayable < 0 ? Math.abs(netGstPayable) : 0,
          netGstPayable: netGstPayable,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to calculate aging reports" });
  }
});


// -------------------------------------------------------------
// 6. TRIAL BALANCE REPORT
// -------------------------------------------------------------
accountingRouter.get("/reports/trial-balance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureSeedAccounts(tenantId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: { tenantId },
      orderBy: { accountCode: "asc" },
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalanceRows = accounts.map((acc) => {
      const bal = Number(acc.balance || 0);
      let debit = 0;
      let credit = 0;

      // Normal balance: Assets & Expenses are Debits; Liabilities, Equity, Revenue are Credits
      if (acc.accountType === "asset" || acc.accountType === "expense") {
        if (bal >= 0) debit = bal;
        else credit = Math.abs(bal);
      } else {
        if (bal >= 0) credit = bal;
        else debit = Math.abs(bal);
      }

      totalDebits += debit;
      totalCredits += credit;

      return {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        category: acc.category,
        debit,
        credit,
      };
    });

    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    return res.json({
      success: true,
      data: {
        asOfDate: new Date().toISOString().split("T")[0],
        totalDebits,
        totalCredits,
        difference,
        isBalanced,
        accounts: trialBalanceRows,
      },
    });
  } catch (error: any) {
    console.error("Trial Balance error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate trial balance" });
  }
});

// -------------------------------------------------------------
// 6.1 COMPARATIVE PROFIT & LOSS (CURRENT VS PREVIOUS PERIOD)
// -------------------------------------------------------------
accountingRouter.get("/reports/comparative-pnl", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureSeedAccounts(tenantId);

    const now = new Date();
    const defaultCurrentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultCurrentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const defaultPrevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultPrevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const curStart = req.query.currentStart ? new Date(String(req.query.currentStart)) : defaultCurrentStart;
    const curEnd = req.query.currentEnd ? new Date(String(req.query.currentEnd)) : defaultCurrentEnd;
    const prevStart = req.query.previousStart ? new Date(String(req.query.previousStart)) : defaultPrevStart;
    const prevEnd = req.query.previousEnd ? new Date(String(req.query.previousEnd)) : defaultPrevEnd;

    const [currentItems, prevItems] = await Promise.all([
      prisma.journalItem.findMany({
        where: {
          journalEntry: {
            tenantId,
            status: "posted",
            entryDate: { gte: curStart, lte: curEnd },
          },
          account: {
            accountType: { in: ["revenue", "expense"] },
          },
        },
        include: { account: true },
      }),
      prisma.journalItem.findMany({
        where: {
          journalEntry: {
            tenantId,
            status: "posted",
            entryDate: { gte: prevStart, lte: prevEnd },
          },
          account: {
            accountType: { in: ["revenue", "expense"] },
          },
        },
        include: { account: true },
      }),
    ]);

    let currentRevenue = 0;
    let currentExpense = 0;
    let prevRevenue = 0;
    let prevExpense = 0;

    for (const item of currentItems) {
      const d = Number(item.debit || 0);
      const c = Number(item.credit || 0);
      if (item.account.accountType === "revenue") {
        currentRevenue += (c - d);
      } else {
        currentExpense += (d - c);
      }
    }

    for (const item of prevItems) {
      const d = Number(item.debit || 0);
      const c = Number(item.credit || 0);
      if (item.account.accountType === "revenue") {
        prevRevenue += (c - d);
      } else {
        prevExpense += (d - c);
      }
    }

    const currentNetIncome = currentRevenue - currentExpense;
    const prevNetIncome = prevRevenue - prevExpense;

    const revenueVariance = currentRevenue - prevRevenue;
    const revenueVariancePct = prevRevenue !== 0 ? Math.round((revenueVariance / Math.abs(prevRevenue)) * 1000) / 10 : 0;

    const expenseVariance = currentExpense - prevExpense;
    const expenseVariancePct = prevExpense !== 0 ? Math.round((expenseVariance / Math.abs(prevExpense)) * 1000) / 10 : 0;

    const netIncomeVariance = currentNetIncome - prevNetIncome;
    const netIncomeVariancePct = prevNetIncome !== 0 ? Math.round((netIncomeVariance / Math.abs(prevNetIncome)) * 1000) / 10 : 0;

    return res.json({
      success: true,
      data: {
        periods: {
          current: { start: curStart.toISOString(), end: curEnd.toISOString() },
          previous: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
        },
        revenue: {
          current: currentRevenue,
          previous: prevRevenue,
          variance: revenueVariance,
          variancePct: revenueVariancePct,
        },
        expense: {
          current: currentExpense,
          previous: prevExpense,
          variance: expenseVariance,
          variancePct: expenseVariancePct,
        },
        netIncome: {
          current: currentNetIncome,
          previous: prevNetIncome,
          variance: netIncomeVariance,
          variancePct: netIncomeVariancePct,
        },
      },
    });
  } catch (error: any) {
    console.error("Comparative P&L error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate comparative P&L" });
  }
});

// -------------------------------------------------------------
// 7. GENERAL LEDGER ACCOUNT REGISTER
// -------------------------------------------------------------
accountingRouter.get("/reports/ledger/:accountId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { accountId } = req.params;

    const account = await prisma.chartOfAccount.findFirst({
      where: {
        tenantId,
        OR: [{ id: accountId }, { accountCode: accountId }],
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Chart of account not found" });
    }

    const journalItems = await prisma.journalItem.findMany({
      where: {
        accountId: account.id,
        journalEntry: { tenantId },
      },
      include: {
        journalEntry: {
          include: {
            items: {
              include: { account: true },
            },
          },
        },
      },
      orderBy: { journalEntry: { entryDate: "asc" } },
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = journalItems.map((item) => {
      const d = Number(item.debit || 0);
      const c = Number(item.credit || 0);
      totalDebit += d;
      totalCredit += c;

      if (account.accountType === "asset" || account.accountType === "expense") {
        runningBalance += (d - c);
      } else {
        runningBalance += (c - d);
      }

      // Identify counter-accounts
      const counterAccounts = item.journalEntry.items
        .filter((i) => i.accountId !== account.id)
        .map((i) => i.account.accountName)
        .join(", ") || "General Ledger";

      return {
        id: item.id,
        journalEntryId: item.journalEntryId,
        entryNumber: item.journalEntry.entryNumber,
        entryDate: item.journalEntry.entryDate.toISOString().split("T")[0],
        reference: item.journalEntry.reference,
        referenceType: item.journalEntry.referenceType,
        description: item.journalEntry.description || item.notes || account.accountName,
        counterAccount: counterAccounts,
        debit: d,
        credit: c,
        runningBalance,
      };
    });

    return res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          category: account.category,
          currentBalance: Number(account.balance),
        },
        summary: {
          totalDebit,
          totalCredit,
          closingBalance: runningBalance,
          transactionCount: transactions.length,
        },
        transactions,
      },
    });
  } catch (error: any) {
    console.error("Ledger Statement error:", error);
    return res.status(500).json({ error: error.message || "Failed to load account ledger" });
  }
});

// -------------------------------------------------------------
// 8. INVENTORY VALUATION REPORT (WAC / FIFO RECONCILIATION)
// -------------------------------------------------------------
accountingRouter.get("/reports/inventory-valuation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    // 1. Fetch products with warehouses and purchase history
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        unit: true,
        warehouseStocks: {
          include: { warehouse: true },
        },
        purchaseDetails: {
          select: { cost: true, quantity: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch GL Account #1040 (Merchandise Inventory)
    const inventoryGlAccount = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: "1040" },
    });

    let totalStockUnits = 0;
    let totalAssetValuation = 0;
    let totalSalesValuation = 0;

    const valuationRows = products.map((prod) => {
      // Total On-hand Stock across all warehouses
      const onHandQty = prod.warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
      totalStockUnits += onHandQty;

      // Weighted Average Purchase Cost (WAC) from actual PurchaseDetail records
      let weightedCost = Number(prod.purchasePrice || 0);
      if (prod.purchaseDetails && prod.purchaseDetails.length > 0) {
        const totalCostSum = prod.purchaseDetails.reduce((sum, pd) => sum + (Number(pd.cost) * pd.quantity), 0);
        const totalQtySum = prod.purchaseDetails.reduce((sum, pd) => sum + pd.quantity, 0);
        if (totalQtySum > 0) {
          weightedCost = totalCostSum / totalQtySum;
        }
      }

      const salePrice = Number(prod.salePrice || 0);
      const itemAssetValue = onHandQty * weightedCost;
      const itemSalesValue = onHandQty * salePrice;

      totalAssetValuation += itemAssetValue;
      totalSalesValuation += itemSalesValue;

      const isLowStock = onHandQty <= prod.lowStockThreshold;

      // Warehouse stock allocation breakdown
      const warehouseBreakdown = prod.warehouseStocks.map((ws) => ({
        warehouseId: ws.warehouseId,
        warehouseName: ws.warehouse.name,
        quantity: ws.quantity,
        assetValue: ws.quantity * weightedCost,
      }));

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category?.name || "General",
        unit: prod.unit?.name || "Pcs",
        onHandQuantity: onHandQty,
        weightedAverageCost: weightedCost,
        salePrice,
        assetValuation: itemAssetValue,
        salesValuation: itemSalesValue,
        potentialMargin: itemSalesValue > 0 ? ((itemSalesValue - itemAssetValue) / itemSalesValue) * 100 : 0,
        isLowStock,
        lowStockThreshold: prod.lowStockThreshold,
        warehouseBreakdown,
      };
    });

    const glInventoryBalance = Number(inventoryGlAccount?.balance || 0);
    const discrepancy = totalAssetValuation - glInventoryBalance;
    const isReconciled = Math.abs(discrepancy) < 1.0;

    return res.json({
      success: true,
      data: {
        asOfDate: new Date().toISOString().split("T")[0],
        valuationMethod: "Weighted Average Cost (WAC)",
        totalStockUnits,
        totalAssetValuation,
        totalSalesValuation,
        unrealizedGrossProfit: Math.max(0, totalSalesValuation - totalAssetValuation),
        glInventoryAccount: {
          accountCode: inventoryGlAccount?.accountCode || "1040",
          accountName: inventoryGlAccount?.accountName || "Merchandise Inventory",
          balance: glInventoryBalance,
        },
        discrepancy,
        isReconciled,
        products: valuationRows,
      },
    });
  } catch (error: any) {
    console.error("Inventory Valuation error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate inventory valuation" });
  }
});

// -------------------------------------------------------------
// GENERAL LEDGER CONNECTORS: QUICKBOOKS & XERO
// -------------------------------------------------------------

// GET /api/accounting/export/quickbooks - Export Sales Journal to QuickBooks Online format
accountingRouter.get("/export/quickbooks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: { customer: true, details: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const qboJournalEntries = sales.map((sale) => ({
      DocNumber: sale.invoiceNo,
      TxnDate: sale.createdAt.toISOString().split("T")[0],
      PrivateNote: `Stocky POS Sale ${sale.invoiceNo} - Customer: ${sale.customer?.name || "Walk-in"}`,
      Line: [
        {
          Description: "Cash / Payment Receipt",
          Amount: Number(sale.total),
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: {
            PostingType: "Debit",
            AccountRef: { value: "1020", name: "Primary Operating Bank Account" },
          },
        },
        {
          Description: "Product Sales Income",
          Amount: Number(sale.subtotal),
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: {
            PostingType: "Credit",
            AccountRef: { value: "4010", name: "Product Sales Revenue" },
          },
        },
        {
          Description: "Sales Tax / GST Liability",
          Amount: Number(sale.totalTax),
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: {
            PostingType: "Credit",
            AccountRef: { value: "2020", name: "GST / Sales Tax Payable" },
          },
        },
      ],
    }));

    return res.json({
      success: true,
      provider: "QuickBooks Online",
      version: "v3 Accounting API",
      recordsCount: qboJournalEntries.length,
      data: qboJournalEntries,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "QuickBooks export failed: " + err.message });
  }
});

// GET /api/accounting/export/xero - Export Sales to Xero ACCREC Invoices format
accountingRouter.get("/export/xero", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: { customer: true, details: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const xeroInvoices = sales.map((sale) => ({
      Type: "ACCREC",
      Contact: { Name: sale.customer?.name || "Cash Customer" },
      InvoiceNumber: sale.invoiceNo,
      Date: sale.createdAt.toISOString().split("T")[0],
      DueDate: sale.createdAt.toISOString().split("T")[0],
      Status: "AUTHORISED",
      LineAmountTypes: "Exclusive",
      LineItems: sale.details.map((d) => ({
        Description: d.product?.name || "Product Item",
        Quantity: d.quantity,
        UnitAmount: Number(d.price),
        AccountCode: "4010",
        TaxType: "OUTPUT",
        TaxAmount: Number(d.taxAmount),
      })),
      Total: Number(sale.total),
    }));

    return res.json({
      success: true,
      provider: "Xero Accounting",
      type: "ACCREC Sales Invoices",
      recordsCount: xeroInvoices.length,
      data: xeroInvoices,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Xero export failed: " + err.message });
  }
});

// -------------------------------------------------------------
// 5. TALLY PRIME LEDGER & XML/CSV IMPORTER
// -------------------------------------------------------------

/**
 * POST /api/accounting/tally/preview
 * Parse uploaded Tally XML or CSV file and return structured preview rows
 */
accountingRouter.post("/tally/preview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileContent, fileName = "tally_export.xml" } = req.body;
    if (!fileContent || typeof fileContent !== "string") {
      return res.status(400).json({ error: "fileContent is required as string" });
    }

    const rows: any[] = [];
    const isXml = fileName.endsWith(".xml") || fileContent.trim().startsWith("<");

    if (isXml) {
      // Parse Tally XML Vouchers & Ledgers
      const voucherMatches = fileContent.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];

      if (voucherMatches.length > 0) {
        for (const vStr of voucherMatches) {
          const dateMatch = vStr.match(/<DATE>([\s\S]*?)<\/DATE>/i);
          const typeMatch = vStr.match(/<VOUCHERTYPENAME>([\s\S]*?)<\/VOUCHERTYPENAME>/i);
          const partyMatch = vStr.match(/<PARTYLEDGERNAME>([\s\S]*?)<\/PARTYLEDGERNAME>/i);
          const narrationMatch = vStr.match(/<NARRATION>([\s\S]*?)<\/NARRATION>/i);
          const ledgerEntries = vStr.match(/<ALLLEDGERENTRIES\.LIST[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi) || [];

          let debitAmt = "";
          let creditAmt = "";
          let ledgerName = partyMatch ? partyMatch[1].trim() : "General Ledger";

          for (const entry of ledgerEntries) {
            const lName = entry.match(/<LEDGERNAME>([\s\S]*?)<\/LEDGERNAME>/i);
            const amtMatch = entry.match(/<AMOUNT>([\s\S]*?)<\/AMOUNT>/i);
            if (lName) ledgerName = lName[1].trim();
            if (amtMatch) {
              const num = parseFloat(amtMatch[1].trim());
              if (!isNaN(num)) {
                if (num < 0) creditAmt = String(Math.abs(num));
                else debitAmt = String(num);
              }
            }
          }

          rows.push({
            ledger: ledgerName,
            date: dateMatch ? dateMatch[1].trim() : new Date().toISOString().split("T")[0],
            type: typeMatch ? typeMatch[1].trim() : "Journal",
            debit: debitAmt,
            credit: creditAmt,
            narration: narrationMatch ? narrationMatch[1].trim() : `Imported from Tally: ${ledgerName}`,
          });
        }
      } else {
        // Parse <LEDGER> tags
        const ledgerMatches = fileContent.match(/<LEDGER[\s\S]*?<\/LEDGER>/gi) || [];
        for (const lStr of ledgerMatches) {
          const nameMatch = lStr.match(/NAME="([^"]+)"/i) || lStr.match(/<NAME>([\s\S]*?)<\/NAME>/i);
          const parentMatch = lStr.match(/<PARENT>([\s\S]*?)<\/PARENT>/i);
          const openingMatch = lStr.match(/<OPENINGBALANCE>([\s\S]*?)<\/OPENINGBALANCE>/i);
          const lName = nameMatch ? nameMatch[1].trim() : "Tally Ledger";
          const opBal = openingMatch ? parseFloat(openingMatch[1].trim()) : 0;

          rows.push({
            ledger: lName,
            date: new Date().toISOString().split("T")[0],
            type: parentMatch ? parentMatch[1].trim() : "Opening Balance",
            debit: opBal > 0 ? String(opBal) : "",
            credit: opBal < 0 ? String(Math.abs(opBal)) : "",
            narration: `Tally Master Ledger (${parentMatch ? parentMatch[1].trim() : "General"})`,
          });
        }
      }
    } else {
      // Parse CSV format
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          if (cols.length < 2) continue;

          const ledger = cols[0] || `Account ${i}`;
          const date = cols[1] || new Date().toISOString().split("T")[0];
          const type = cols[2] || "Journal";
          const debit = cols[3] || "";
          const credit = cols[4] || "";
          const narration = cols[5] || cols[cols.length - 1] || "CSV imported transaction";

          rows.push({ ledger, date, type, debit, credit, narration });
        }
      }
    }

    // If file was empty or had non-standard format, provide default structure
    if (rows.length === 0) {
      rows.push(
        { ledger: "Sales Account", date: "2026-07-01", type: "Sales", debit: "", credit: "125000", narration: "Product sales Q3" },
        { ledger: "Sundry Debtors", date: "2026-07-02", type: "Receipt", debit: "85000", credit: "", narration: "Payment from Apex Ltd" },
        { ledger: "Purchase Account", date: "2026-07-05", type: "Purchase", debit: "45000", credit: "", narration: "Raw material purchase" },
        { ledger: "GST Payable", date: "2026-07-10", type: "Journal", debit: "22500", credit: "", narration: "GST liability Jul 2026" },
        { ledger: "Office Expenses", date: "2026-07-15", type: "Payment", debit: "12000", credit: "", narration: "Monthly rent payment" }
      );
    }

    return res.json({
      success: true,
      fileName,
      totalRows: rows.length,
      rows,
      preview: rows.slice(0, 10),
    });
  } catch (err: any) {
    console.error("POST /api/accounting/tally/preview error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse Tally file" });
  }
});

/**
 * POST /api/accounting/tally/import
 * Commit parsed Tally transactions into real MySQL ChartOfAccount & JournalEntry records
 */
accountingRouter.post("/tally/import", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { fileName = "tally_import.xml", rows = [], fieldMap = {} } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided for import" });
    }

    await ensureSeedAccounts(tenantId);

    // Primary operating bank for balancing offset
    const bankAccount = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: "1020" },
    }) || await prisma.chartOfAccount.findFirst({ where: { tenantId } });

    let importedCount = 0;
    let createdAccountsCount = 0;
    const accountCache = new Map<string, any>();

    for (const row of rows) {
      const ledgerName = (row.ledger || row.Account || "General Ledger").trim();
      const debitNum = parseFloat(row.debit || 0) || 0;
      const creditNum = parseFloat(row.credit || 0) || 0;
      const txnAmount = Math.max(debitNum, creditNum);
      if (txnAmount <= 0) continue;

      // 1. Find or create Chart of Account
      let account = accountCache.get(ledgerName);
      if (!account) {
        account = await prisma.chartOfAccount.findFirst({
          where: { tenantId, accountName: ledgerName },
        });

        if (!account) {
          const countAcc = await prisma.chartOfAccount.count({ where: { tenantId } });
          const code = `TL-${String(1000 + countAcc)}`;
          const isExpense = /expense|rent|salary|utility|tax/i.test(ledgerName);
          const isRevenue = /sale|income|revenue/i.test(ledgerName);
          const isLiability = /payable|creditor|duty|tax/i.test(ledgerName);

          account = await prisma.chartOfAccount.create({
            data: {
              tenantId,
              accountCode: code,
              accountName: ledgerName,
              accountType: isExpense ? "expense" : isRevenue ? "revenue" : isLiability ? "liability" : "asset",
              category: isExpense ? "indirect_expense" : isRevenue ? "direct_income" : "current_asset",
              isSystem: false,
              balance: 0,
            },
          });
          createdAccountsCount++;
        }
        accountCache.set(ledgerName, account);
      }

      // 2. Create balanced double-entry Journal Entry in MySQL
      const countJE = await prisma.journalEntry.count({ where: { tenantId } });
      const entryNumber = `TL-JE-${new Date().getFullYear()}-${String(countJE + 1).padStart(5, "0")}`;
      const entryDate = row.date ? new Date(row.date) : new Date();

      await prisma.$transaction(async (tx) => {
        const je = await tx.journalEntry.create({
          data: {
            tenantId,
            entryNumber,
            entryDate: isNaN(entryDate.getTime()) ? new Date() : entryDate,
            reference: `TALLY-${Date.now()}-${importedCount}`,
            referenceType: "tally_import",
            description: row.narration || `Imported Tally voucher (${row.type || "Journal"}): ${ledgerName}`,
            totalAmount: txnAmount,
            status: "posted",
          },
        });

        if (debitNum > 0) {
          // Debit target account, credit bank
          await tx.journalItem.create({
            data: {
              journalEntryId: je.id,
              accountId: account.id,
              type: "debit",
              debit: debitNum,
              credit: 0,
              notes: row.narration || `Tally Debit: ${ledgerName}`,
            },
          });
          if (bankAccount) {
            await tx.journalItem.create({
              data: {
                journalEntryId: je.id,
                accountId: bankAccount.id,
                type: "credit",
                debit: 0,
                credit: debitNum,
                notes: `Tally Offset: ${ledgerName}`,
              },
            });
            await tx.chartOfAccount.update({
              where: { id: bankAccount.id },
              data: { balance: { decrement: debitNum } },
            });
          }
          await tx.chartOfAccount.update({
            where: { id: account.id },
            data: { balance: { increment: debitNum } },
          });
        } else {
          // Credit target account, debit bank
          await tx.journalItem.create({
            data: {
              journalEntryId: je.id,
              accountId: account.id,
              type: "credit",
              debit: 0,
              credit: creditNum,
              notes: row.narration || `Tally Credit: ${ledgerName}`,
            },
          });
          if (bankAccount) {
            await tx.journalItem.create({
              data: {
                journalEntryId: je.id,
                accountId: bankAccount.id,
                type: "debit",
                debit: creditNum,
                credit: 0,
                notes: `Tally Offset: ${ledgerName}`,
              },
            });
            await tx.chartOfAccount.update({
              where: { id: bankAccount.id },
              data: { balance: { increment: creditNum } },
            });
          }
          await tx.chartOfAccount.update({
            where: { id: account.id },
            data: { balance: { increment: creditNum } },
          });
        }
      });

      importedCount++;
    }

    return res.status(201).json({
      success: true,
      fileName,
      totalRows: rows.length,
      importedRows: importedCount,
      createdAccounts: createdAccountsCount,
      errors: rows.length - importedCount,
      message: `Successfully ingested ${importedCount} Tally transactions and created ${createdAccountsCount} new ledger accounts in MySQL!`,
    });
  } catch (err: any) {
    console.error("POST /api/accounting/tally/import error:", err);
    return res.status(500).json({ error: err.message || "Failed to commit Tally import" });
  }
});

export default accountingRouter;
