import { rawPrisma as prisma } from "../prisma";

export interface BankStatementRow {
  transactionDate: string; // ISO date or "YYYY-MM-DD"
  description: string;
  referenceNo?: string;
  debit?: number; // Outflow (vendor payment, expense)
  credit?: number; // Inflow (customer receipt, sales)
  balance?: number;
}

export interface ReconcileInput {
  tenantId: string;
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  statementRows: BankStatementRow[];
  autoMatchThreshold?: number; // e.g. 75
}

export interface MatchedPair {
  bankRowIndex: number;
  bankTransaction: BankStatementRow;
  matchedEntity: {
    type: "sale_payment" | "purchase_payment" | "journal_entry";
    id: string;
    reference: string;
    amount: number;
    date: string;
  };
  matchType: "EXACT_MATCH" | "REFERENCE_MATCH" | "AMOUNT_DATE_MATCH" | "FUZZY_DATE_MATCH";
  confidenceScore: number;
}

export interface ReconciliationReport {
  tenantId: string;
  totalStatementRows: number;
  totalCredits: number;
  totalDebits: number;
  matchedCount: number;
  unmatchedCount: number;
  matchedAmount: number;
  unmatchedAmount: number;
  matchedPairs: MatchedPair[];
  unmatchedBankRows: BankStatementRow[];
  summary: {
    statementClosingBalanceVariance: number;
    reconciliationPercentage: number;
    status: "BALANCED" | "DISCREPANCY_FLAGGED";
  };
}

export class BankReconciliationService {
  /**
   * Reconciles a bank statement against ERP payments and general ledger vouchers
   */
  static async reconcile(input: ReconcileInput): Promise<ReconciliationReport> {
    const { tenantId, statementRows, autoMatchThreshold = 75 } = input;

    let totalCredits = 0;
    let totalDebits = 0;
    for (const row of statementRows) {
      if (row.credit) totalCredits += Number(row.credit);
      if (row.debit) totalDebits += Number(row.debit);
    }

    // 1. Fetch Tenant Payments (SalePayment for credits, PurchasePayment for debits, and JournalEntries)
    const [salePayments, journalEntries] = await Promise.all([
      prisma.salePayment.findMany({
        where: {
          sale: { tenantId },
        },
        take: 200,
        orderBy: { paidAt: "desc" },
      }),
      prisma.journalEntry.findMany({
        where: { tenantId },
        take: 200,
        orderBy: { entryDate: "desc" },
        include: { items: true },
      }),
    ]);

    const availablePayments = salePayments.map((sp) => ({
      type: "sale_payment" as const,
      id: sp.id,
      reference: sp.referenceNo || "",
      notes: sp.notes || "",
      amount: Number(sp.amount),
      date: sp.paidAt.toISOString().slice(0, 10),
      isCredit: true,
      used: false,
    }));

    const availableJournals = journalEntries.map((je) => ({
      type: "journal_entry" as const,
      id: je.id,
      reference: je.reference || je.entryNumber,
      notes: je.description || "",
      amount: Number(je.totalAmount),
      date: je.entryDate.toISOString().slice(0, 10),
      isCredit: false,
      used: false,
    }));

    const ledgerCandidates = [...availablePayments, ...availableJournals];

    const matchedPairs: MatchedPair[] = [];
    const unmatchedBankRows: BankStatementRow[] = [];
    let matchedAmount = 0;

    // 2. Multi-tier Matching Engine
    statementRows.forEach((bankRow, idx) => {
      const isCredit = !!bankRow.credit && Number(bankRow.credit) > 0;
      const bankAmount = isCredit ? Number(bankRow.credit) : Number(bankRow.debit || 0);
      const bankDate = new Date(bankRow.transactionDate).getTime();
      const bankRef = (bankRow.referenceNo || "").toLowerCase().trim();
      const bankDesc = (bankRow.description || "").toLowerCase();

      let bestMatch: (typeof ledgerCandidates)[0] | null = null;
      let highestScore = 0;
      let matchType: MatchedPair["matchType"] = "AMOUNT_DATE_MATCH";

      for (const cand of ledgerCandidates) {
        if (cand.used) continue;

        const candDate = new Date(cand.date).getTime();
        const dayDiff = Math.abs(bankDate - candDate) / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(cand.amount - bankAmount);

        let score = 0;

        // Exact amount check
        if (amountDiff < 0.01) {
          // Check reference match
          const candRef = cand.reference.toLowerCase().trim();
          const hasRefMatch =
            (bankRef && candRef && (bankRef === candRef || bankDesc.includes(candRef) || candRef.includes(bankRef))) ||
            (cand.notes && bankRef && cand.notes.toLowerCase().includes(bankRef));

          if (hasRefMatch && dayDiff <= 4) {
            score = 100;
            matchType = "EXACT_MATCH";
          } else if (dayDiff === 0) {
            score = 85;
            matchType = "AMOUNT_DATE_MATCH";
          } else if (dayDiff <= 3) {
            score = 75;
            matchType = "FUZZY_DATE_MATCH";
          }
        } else if (bankRef && cand.reference && bankRef === cand.reference.toLowerCase().trim()) {
          // Reference exact match but minor amount variance
          score = 90;
          matchType = "REFERENCE_MATCH";
        }

        if (score > highestScore && score >= autoMatchThreshold) {
          highestScore = score;
          bestMatch = cand;
        }
      }

      if (bestMatch) {
        bestMatch.used = true;
        matchedAmount += bankAmount;
        matchedPairs.push({
          bankRowIndex: idx,
          bankTransaction: bankRow,
          matchedEntity: {
            type: bestMatch.type,
            id: bestMatch.id,
            reference: bestMatch.reference,
            amount: bestMatch.amount,
            date: bestMatch.date,
          },
          matchType,
          confidenceScore: highestScore,
        });
      } else {
        unmatchedBankRows.push(bankRow);
      }
    });

    const totalStatementAmount = totalCredits + totalDebits;
    const unmatchedAmount = totalStatementAmount - matchedAmount;
    const reconciliationPercentage = totalStatementAmount > 0 ? Math.round((matchedAmount / totalStatementAmount) * 100) : 100;

    return {
      tenantId,
      totalStatementRows: statementRows.length,
      totalCredits,
      totalDebits,
      matchedCount: matchedPairs.length,
      unmatchedCount: unmatchedBankRows.length,
      matchedAmount,
      unmatchedAmount,
      matchedPairs,
      unmatchedBankRows,
      summary: {
        statementClosingBalanceVariance: unmatchedAmount,
        reconciliationPercentage,
        status: unmatchedAmount === 0 ? "BALANCED" : "DISCREPANCY_FLAGGED",
      },
    };
  }

  /**
   * Helper to parse standard CSV text of bank statements
   */
  static parseBankCsv(csvText: string): BankStatementRow[] {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const rows: BankStatementRow[] = [];
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));

    const dateIdx = header.findIndex((h) => h.includes("date"));
    const descIdx = header.findIndex((h) => h.includes("desc") || h.includes("narration") || h.includes("particulars"));
    const refIdx = header.findIndex((h) => h.includes("ref") || h.includes("chq") || h.includes("cheque") || h.includes("utr"));
    const debitIdx = header.findIndex((h) => h.includes("debit") || h.includes("withdrawal"));
    const creditIdx = header.findIndex((h) => h.includes("credit") || h.includes("deposit"));
    const balIdx = header.findIndex((h) => h.includes("balance"));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const transDate = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
      const desc = descIdx >= 0 && cols[descIdx] ? cols[descIdx] : "Bank Transaction";
      const ref = refIdx >= 0 && cols[refIdx] ? cols[refIdx] : "";
      const debit = debitIdx >= 0 && cols[debitIdx] ? parseFloat(cols[debitIdx]) || 0 : 0;
      const credit = creditIdx >= 0 && cols[creditIdx] ? parseFloat(cols[creditIdx]) || 0 : 0;
      const bal = balIdx >= 0 && cols[balIdx] ? parseFloat(cols[balIdx]) || 0 : 0;

      rows.push({
        transactionDate: transDate,
        description: desc,
        referenceNo: ref,
        debit,
        credit,
        balance: bal,
      });
    }

    return rows;
  }
}
