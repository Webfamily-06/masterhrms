import { prisma, rawPrisma } from "../prisma";
import { ContractBillingService, ClientBillingSummary, SupplyType } from "./contract-billing.service";
import { CompanyProfileService } from "./company-profile/company-profile.service";

const db = rawPrisma || prisma;

export type InvoiceWorkflowStatus = "DRAFT" | "VALIDATED" | "APPROVED" | "ISSUED" | "PAID" | "CANCELLED";

export interface GeneratedStaffingInvoice {
  id: string;
  invoiceNo: string;
  payrollRunId: string;
  clientId: string;
  clientName: string;
  headcount: number;
  billableCtc: number;
  mmuAmount: number;
  taxableSupplyValue: number;
  supplyType: SupplyType;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  status: InvoiceWorkflowStatus;
  createdAt: Date;
}

export class ContractInvoiceService {
  /**
   * Generate sequential unique invoice number for staffing billing:
   * e.g. INV-202610-ENABL-0001
   */
  public static async generateNextInvoiceNumber(
    tenantId: string,
    periodYear: number,
    periodMonth: number,
    clientCode?: string
  ): Promise<string> {
    const cleanCode = (clientCode || "STAFF").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "STAFF";
    const yearMonth = `${periodYear}${String(periodMonth).padStart(2, "0")}`;
    const prefix = `INV-${yearMonth}-${cleanCode}`;

    // Count existing invoices with this prefix
    const count = await db.sale.count({
      where: {
        tenantId,
        invoiceNo: {
          startsWith: prefix,
        },
      },
    });

    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}-${seq}`;
  }

  /**
   * Find or create Customer in ERP corresponding to StaffingClient
   */
  public static async findOrCreateCustomerForClient(
    client: { id: string; name: string; gstin?: string | null; address?: string | null },
    tenantId: string
  ) {
    let customer = await db.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { name: client.name },
          ...(client.gstin ? [{ gstin: client.gstin }] : []),
        ],
      },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId,
          name: client.name,
          address: client.address || undefined,
          gstin: client.gstin || undefined,
        },
      });
    }

    return customer;
  }

  /**
   * Generate Draft or Approved Invoices for all Staffing Clients in an approved payroll run
   */
  public static async generateInvoicesForPayrollRun(
    payrollRunId: string,
    tenantId: string,
    actorId: string,
    options?: {
      targetClientId?: string;
      initialStatus?: InvoiceWorkflowStatus;
      forceRegenerate?: boolean;
    }
  ): Promise<{
    invoices: GeneratedStaffingInvoice[];
    totalCreated: number;
    totalAmount: number;
  }> {
    const run = await db.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
    });

    if (!run) {
      throw new Error(`Payroll run ${payrollRunId} not found.`);
    }

    // Require run to be non-draft or warn
    const allowedRunStatuses = ["APPROVED", "COMPLETED", "PROCESSED", "LOCKED"];
    const runStatus = (run.status || "").toUpperCase();
    if (!allowedRunStatuses.includes(runStatus)) {
      console.warn(`[ContractInvoiceService] Generating billing for payroll run in '${runStatus}' state.`);
    }

    // Generate billing manifest
    const manifest = await ContractBillingService.generateRunBillingManifest(
      payrollRunId,
      tenantId,
      { targetClientId: options?.targetClientId }
    );

    if (manifest.clients.length === 0) {
      throw new Error(
        `No staffing clients found with billable headcount in payroll run ${payrollRunId}. Ensure employees are assigned to a staffing client.`
      );
    }

    const createdInvoices: GeneratedStaffingInvoice[] = [];

    for (const clientSummary of manifest.clients) {
      // Check for existing invoice for this cycle & client
      const existingInvoices = await db.sale.findMany({
        where: {
          tenantId,
          type: "staffing_billing",
        },
      });

      // Filter by payroll metadata in notes
      const duplicate = existingInvoices.find((sale) => {
        try {
          if (!sale.notes) return false;
          const meta = JSON.parse(sale.notes);
          return (
            meta.payrollRunId === payrollRunId &&
            meta.clientId === clientSummary.clientId &&
            meta.workflowStatus !== "CANCELLED"
          );
        } catch {
          return false;
        }
      });

      if (duplicate && !options?.forceRegenerate) {
        // AUD-CONC-002: Idempotent return of existing invoice
        let meta: any = {};
        try {
          meta = duplicate.notes ? JSON.parse(duplicate.notes) : {};
        } catch {}
        createdInvoices.push({
          id: duplicate.id,
          invoiceNo: duplicate.invoiceNo,
          payrollRunId,
          clientId: clientSummary.clientId,
          clientName: clientSummary.clientName,
          headcount: clientSummary.headcount,
          billableCtc: clientSummary.totalBillableCtc,
          mmuAmount: clientSummary.totalMmu,
          taxableSupplyValue: clientSummary.taxableSupplyValue,
          supplyType: clientSummary.supplyType,
          cgst: clientSummary.cgst,
          sgst: clientSummary.sgst,
          igst: clientSummary.igst,
          totalGst: clientSummary.totalGst,
          totalAmount: Number(duplicate.total),
          status: meta.workflowStatus || "DRAFT",
          createdAt: duplicate.createdAt,
        });
        continue;
      }

      if (duplicate && options?.forceRegenerate) {
        // Mark existing as cancelled
        await this.updateInvoiceStatus(duplicate.id, tenantId, "CANCELLED", actorId, "Re-generated by billing service");
      }

      // Generate unique invoice number
      const invoiceNo = await this.generateNextInvoiceNumber(
        tenantId,
        manifest.periodYear,
        manifest.periodMonth,
        clientSummary.clientCode
      );

      // Customer link
      const customer = await this.findOrCreateCustomerForClient(
        {
          id: clientSummary.clientId,
          name: clientSummary.clientName,
          gstin: clientSummary.clientGstin,
          address: clientSummary.clientBillingStateCode,
        },
        tenantId
      );

      const workflowStatus: InvoiceWorkflowStatus = options?.initialStatus || "DRAFT";

      const metadata = {
        source: "STAFFING_PAYROLL_AUTOMATION",
        payrollRunId,
        periodMonth: manifest.periodMonth,
        periodYear: manifest.periodYear,
        clientId: clientSummary.clientId,
        clientName: clientSummary.clientName,
        clientCode: clientSummary.clientCode,
        headcount: clientSummary.headcount,
        mmuBasis: clientSummary.mmuBasis,
        mmuRate: clientSummary.mmuRate,
        supplierStateCode: clientSummary.supplierStateCode,
        clientStateCode: clientSummary.clientBillingStateCode,
        supplyType: clientSummary.supplyType,
        totalGrossWages: clientSummary.totalGrossWages,
        totalEmployerStatutory: clientSummary.totalEmployerStatutory,
        totalBillableCtc: clientSummary.totalBillableCtc,
        totalMmu: clientSummary.totalMmu,
        taxableSupplyValue: clientSummary.taxableSupplyValue,
        cgst: clientSummary.cgst,
        sgst: clientSummary.sgst,
        igst: clientSummary.igst,
        totalGst: clientSummary.totalGst,
        totalInvoiceAmount: clientSummary.totalInvoiceAmount,
        workflowStatus,
        createdBy: actorId,
        createdAt: new Date().toISOString(),
      };

      // Create Sale record
      const sale = await db.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: "staffing_billing",
          customerId: customer.id,
          customerName: clientSummary.clientName,
          customerGstin: clientSummary.clientGstin || null,
          subtotal: clientSummary.taxableSupplyValue,
          taxMode: clientSummary.supplyType === "INTRA_STATE" ? "sgst_cgst" : "igst",
          cgst: clientSummary.cgst,
          sgst: clientSummary.sgst,
          igst: clientSummary.igst,
          totalTax: clientSummary.totalGst,
          total: clientSummary.totalInvoiceAmount,
          paidAmount: 0,
          paymentStatus: "unpaid",
          notes: JSON.stringify(metadata),
          details: {
            create: [
              {
                productId: "SERVICE-CTC-BILLING",
                productName: `Billable Personnel CTC (${clientSummary.headcount} Staffing Personnel)`,
                sku: `CTC-${manifest.periodYear}${String(manifest.periodMonth).padStart(2, "0")}`,
                hsnSac: "998513",
                price: clientSummary.totalBillableCtc,
                quantity: 1,
                subtotal: clientSummary.totalBillableCtc,
                taxRate: clientSummary.gstRate,
                taxAmount: ContractBillingService.round(
                  clientSummary.totalBillableCtc * (clientSummary.gstRate / 100)
                ),
              },
              {
                productId: "SERVICE-MMU-MARKUP",
                productName: `Contractor Management Markup (${clientSummary.mmuRate}% MMU on ${clientSummary.mmuBasis})`,
                sku: `MMU-${manifest.periodYear}${String(manifest.periodMonth).padStart(2, "0")}`,
                hsnSac: "998513",
                price: clientSummary.totalMmu,
                quantity: 1,
                subtotal: clientSummary.totalMmu,
                taxRate: clientSummary.gstRate,
                taxAmount: ContractBillingService.round(
                  clientSummary.totalMmu * (clientSummary.gstRate / 100)
                ),
              },
            ],
          },
        },
      });

      createdInvoices.push({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        payrollRunId,
        clientId: clientSummary.clientId,
        clientName: clientSummary.clientName,
        headcount: clientSummary.headcount,
        billableCtc: clientSummary.totalBillableCtc,
        mmuAmount: clientSummary.totalMmu,
        taxableSupplyValue: clientSummary.taxableSupplyValue,
        supplyType: clientSummary.supplyType,
        cgst: clientSummary.cgst,
        sgst: clientSummary.sgst,
        igst: clientSummary.igst,
        totalGst: clientSummary.totalGst,
        totalAmount: clientSummary.totalInvoiceAmount,
        status: workflowStatus,
        createdAt: sale.createdAt,
      });
    }

    return {
      invoices: createdInvoices,
      totalCreated: createdInvoices.length,
      totalAmount: ContractBillingService.round(
        createdInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0)
      ),
    };
  }

  /**
   * Update Invoice Workflow Status with State Machine & Immutability validation
   */
  public static async updateInvoiceStatus(
    invoiceId: string,
    tenantId: string,
    newStatus: InvoiceWorkflowStatus,
    actorId: string,
    reason?: string
  ): Promise<{ id: string; status: InvoiceWorkflowStatus }> {
    const sale = await db.sale.findFirst({
      where: { id: invoiceId, tenantId },
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

    const currentStatus: InvoiceWorkflowStatus = meta.workflowStatus || "DRAFT";

    // State machine check
    const allowedTransitions: Record<InvoiceWorkflowStatus, InvoiceWorkflowStatus[]> = {
      DRAFT: ["VALIDATED", "APPROVED", "CANCELLED"],
      VALIDATED: ["APPROVED", "DRAFT", "CANCELLED"],
      APPROVED: ["ISSUED", "CANCELLED"],
      ISSUED: ["PAID", "CANCELLED"],
      PAID: [], // Terminal financial state
      CANCELLED: [], // Terminal audit state
    };

    if (currentStatus !== newStatus && !allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid invoice status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions[currentStatus]?.join(", ") || "none"}`
      );
    }

    // Immutability protection
    if ((currentStatus === "ISSUED" || currentStatus === "PAID") && newStatus !== "CANCELLED" && newStatus !== "PAID") {
      throw new Error(`Invoice ${sale.invoiceNo} is locked in '${currentStatus}' status and cannot be modified.`);
    }

    meta.workflowStatus = newStatus;
    meta.statusHistory = meta.statusHistory || [];
    meta.statusHistory.push({
      from: currentStatus,
      to: newStatus,
      changedBy: actorId,
      timestamp: new Date().toISOString(),
      reason: reason || null,
    });

    const updateData: any = {
      notes: JSON.stringify(meta),
    };

    if (newStatus === "PAID") {
      updateData.paymentStatus = "paid";
      updateData.paidAmount = sale.total;
    } else if (newStatus === "CANCELLED") {
      updateData.paymentStatus = "cancelled";
    }

    await db.sale.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return {
      id: invoiceId,
      status: newStatus,
    };
  }

  /**
   * List staffing invoices
   */
  public static async listStaffingInvoices(
    tenantId: string,
    filter?: {
      payrollRunId?: string;
      clientId?: string;
      status?: InvoiceWorkflowStatus;
    }
  ): Promise<GeneratedStaffingInvoice[]> {
    const sales = await db.sale.findMany({
      where: {
        tenantId,
        type: "staffing_billing",
      },
      orderBy: { createdAt: "desc" },
    });

    const results: GeneratedStaffingInvoice[] = [];

    for (const sale of sales) {
      let meta: any = {};
      try {
        meta = sale.notes ? JSON.parse(sale.notes) : {};
      } catch {
        meta = {};
      }

      if (filter?.payrollRunId && meta.payrollRunId !== filter.payrollRunId) continue;
      if (filter?.clientId && meta.clientId !== filter.clientId) continue;
      if (filter?.status && meta.workflowStatus !== filter.status) continue;

      results.push({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        payrollRunId: meta.payrollRunId || "",
        clientId: meta.clientId || "",
        clientName: meta.clientName || sale.customerName || "Staffing Client",
        headcount: Number(meta.headcount || 0),
        billableCtc: Number(meta.totalBillableCtc || 0),
        mmuAmount: Number(meta.totalMmu || 0),
        taxableSupplyValue: Number(sale.subtotal || 0),
        supplyType: (meta.supplyType as SupplyType) || "INTRA_STATE",
        cgst: Number(sale.cgst || 0),
        sgst: Number(sale.sgst || 0),
        igst: Number(sale.igst || 0),
        totalGst: Number(sale.totalTax || 0),
        totalAmount: Number(sale.total || 0),
        status: (meta.workflowStatus as InvoiceWorkflowStatus) || "DRAFT",
        createdAt: sale.createdAt,
      });
    }

    return results;
  }
}

