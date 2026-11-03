import { prisma, rawPrisma } from "../prisma";
import { ContractBillingService, RunBillingManifest } from "./contract-billing.service";

const db = rawPrisma || prisma;

export interface ReconciliationAnomaly {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  entityId?: string;
  expectedValue?: number | string;
  actualValue?: number | string;
  variance?: number;
}

export interface ClientInvoiceReconciliationResult {
  payrollRunId: string;
  invoiceId: string;
  invoiceNo: string;
  clientId: string;
  clientName: string;
  reconciledAt: string;
  status: "MATCHED" | "DISCREPANCY_DETECTED";
  headcount: {
    payrollSnapshotCount: number;
    invoiceCount: number;
    isMatched: boolean;
  };
  metrics: {
    payrollGross: number;
    payrollCtc: number;
    payrollMmu: number;
    payrollTaxable: number;
    payrollGst: number;
    payrollTotal: number;
    invoiceSubtotal: number;
    invoiceTax: number;
    invoiceTotal: number;
    grossVariance: number;
    ctcVariance: number;
    mmuVariance: number;
    gstVariance: number;
    totalVariance: number;
  };
  anomalies: ReconciliationAnomaly[];
}

export class ContractBillingReconciliationService {
  /**
   * Reconcile generated invoice against the authoritative payroll cycle snapshots
   */
  public static async reconcileInvoiceAgainstPayroll(
    invoiceId: string,
    tenantId: string
  ): Promise<ClientInvoiceReconciliationResult> {
    const sale = await db.sale.findFirst({
      where: { id: invoiceId, tenantId },
      include: { details: true },
    });

    if (!sale) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    let meta: any = {};
    try {
      meta = sale.notes ? JSON.parse(sale.notes) : {};
    } catch {
      meta = {};
    }

    const payrollRunId = meta.payrollRunId;
    const clientId = meta.clientId;

    if (!payrollRunId || !clientId) {
      throw new Error(
        `Invoice ${sale.invoiceNo} does not contain valid payroll run or staffing client metadata in its audit ledger.`
      );
    }

    // Generate fresh baseline manifest directly from snapshots
    const manifest: RunBillingManifest = await ContractBillingService.generateRunBillingManifest(
      payrollRunId,
      tenantId,
      { targetClientId: clientId }
    );

    const clientSummary = manifest.clients.find((c) => c.clientId === clientId);
    const anomalies: ReconciliationAnomaly[] = [];

    if (!clientSummary) {
      anomalies.push({
        code: "NO_ACTIVE_SNAPSHOTS",
        severity: "CRITICAL",
        message: `No active payroll snapshots found for client ${meta.clientName || clientId} in run ${payrollRunId}`,
        entityId: clientId,
      });

      return {
        payrollRunId,
        invoiceId,
        invoiceNo: sale.invoiceNo,
        clientId,
        clientName: meta.clientName || "Unknown Client",
        reconciledAt: new Date().toISOString(),
        status: "DISCREPANCY_DETECTED",
        headcount: {
          payrollSnapshotCount: 0,
          invoiceCount: meta.headcount || 0,
          isMatched: false,
        },
        metrics: {
          payrollGross: 0,
          payrollCtc: 0,
          payrollMmu: 0,
          payrollTaxable: 0,
          payrollGst: 0,
          payrollTotal: 0,
          invoiceSubtotal: Number(sale.subtotal || 0),
          invoiceTax: Number(sale.totalTax || 0),
          invoiceTotal: Number(sale.total || 0),
          grossVariance: 0,
          ctcVariance: 0,
          mmuVariance: 0,
          gstVariance: 0,
          totalVariance: Number(sale.total || 0),
        },
        anomalies,
      };
    }

    const payrollGross = clientSummary.totalGrossWages;
    const payrollCtc = clientSummary.totalBillableCtc;
    const payrollMmu = clientSummary.totalMmu;
    const payrollTaxable = clientSummary.taxableSupplyValue;
    const payrollGst = clientSummary.totalGst;
    const payrollTotal = clientSummary.totalInvoiceAmount;

    const invoiceSubtotal = Number(sale.subtotal || 0);
    const invoiceTax = Number(sale.totalTax || 0);
    const invoiceTotal = Number(sale.total || 0);

    const grossVariance = ContractBillingService.round(Math.abs(payrollGross - (meta.totalGrossWages || payrollGross)));
    const ctcVariance = ContractBillingService.round(Math.abs(payrollCtc - (meta.totalBillableCtc || payrollCtc)));
    const mmuVariance = ContractBillingService.round(Math.abs(payrollMmu - (meta.totalMmu || payrollMmu)));
    const gstVariance = ContractBillingService.round(Math.abs(payrollGst - invoiceTax));
    const totalVariance = ContractBillingService.round(Math.abs(payrollTotal - invoiceTotal));

    if (totalVariance > 0.01) {
      anomalies.push({
        code: "TOTAL_INVOICE_VARIANCE",
        severity: "CRITICAL",
        message: `Invoice total (₹${invoiceTotal}) does not match recalculated payroll billing total (₹${payrollTotal}).`,
        expectedValue: payrollTotal,
        actualValue: invoiceTotal,
        variance: totalVariance,
      });
    }

    if (gstVariance > 0.01) {
      anomalies.push({
        code: "GST_TAX_VARIANCE",
        severity: "WARNING",
        message: `Invoice tax (₹${invoiceTax}) differs from recalculated payroll GST (₹${payrollGst}).`,
        expectedValue: payrollGst,
        actualValue: invoiceTax,
        variance: gstVariance,
      });
    }

    if (clientSummary.headcount !== meta.headcount) {
      anomalies.push({
        code: "HEADCOUNT_MISMATCH",
        severity: "WARNING",
        message: `Snapshot headcount (${clientSummary.headcount}) differs from invoice recorded headcount (${meta.headcount}).`,
        expectedValue: clientSummary.headcount,
        actualValue: meta.headcount,
      });
    }

    if (manifest.unassignedEmployeeCount > 0) {
      anomalies.push({
        code: "UNASSIGNED_CLIENT_EMPLOYEES",
        severity: "INFO",
        message: `${manifest.unassignedEmployeeCount} employee(s) in payroll run are not mapped to any staffing client.`,
      });
    }

    const isMatched = anomalies.filter((a) => a.severity === "CRITICAL").length === 0 && totalVariance <= 0.01;

    return {
      payrollRunId,
      invoiceId,
      invoiceNo: sale.invoiceNo,
      clientId,
      clientName: clientSummary.clientName,
      reconciledAt: new Date().toISOString(),
      status: isMatched ? "MATCHED" : "DISCREPANCY_DETECTED",
      headcount: {
        payrollSnapshotCount: clientSummary.headcount,
        invoiceCount: meta.headcount || clientSummary.headcount,
        isMatched: clientSummary.headcount === (meta.headcount || clientSummary.headcount),
      },
      metrics: {
        payrollGross,
        payrollCtc,
        payrollMmu,
        payrollTaxable,
        payrollGst,
        payrollTotal,
        invoiceSubtotal,
        invoiceTax,
        invoiceTotal,
        grossVariance,
        ctcVariance,
        mmuVariance,
        gstVariance,
        totalVariance,
      },
      anomalies,
    };
  }
}

