import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { ContractBillingService, MarkupBasis } from "../services/contract-billing.service";
import { ContractInvoiceService, InvoiceWorkflowStatus } from "../services/contract-invoice.service";
import { ContractBillingReconciliationService } from "../services/contract-billing-reconciliation.service";

const db = rawPrisma || prisma;

export const contractBillingRouter = Router();

// Apply auth and tenant resolution to all routes
contractBillingRouter.use(requireAuth, resolveTenantContext);

const BILLING_ADMIN_ROLES = ["super_admin", "tenant_admin", "admin", "finance_manager", "hr_admin"];
const BILLING_VIEW_ROLES = ["super_admin", "tenant_admin", "admin", "finance_manager", "hr_admin", "hr_manager"];

/**
 * GET /api/staffing/clients
 * List all staffing clients with commercial terms and assigned employee count
 */
contractBillingRouter.get(
  "/clients",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;

      const clients = await db.staffingClient.findMany({
        where: { tenantId },
        include: {
          _count: {
            select: { employees: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return res.json({
        success: true,
        data: clients.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          gstin: c.gstin,
          billingStateCode: c.billingStateCode,
          address: c.address,
          serviceChargePct: Number(c.serviceChargePct),
          serviceChargeBase: c.serviceChargeBase,
          status: c.status,
          employeeCount: c._count?.employees || 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error listing clients:", err);
      return res.status(500).json({ error: err.message || "Failed to list staffing clients" });
    }
  }
);

/**
 * POST /api/staffing/clients
 * Register or onboard a new staffing client with commercial contract terms
 */
contractBillingRouter.post(
  "/clients",
  requireRole(...BILLING_ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const {
        name,
        code,
        gstin,
        billingStateCode,
        address,
        serviceChargePct = 10.0,
        serviceChargeBase = "GROSS_PLUS_PF",
        status = "active",
      } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Client name is required." });
      }

      // Format code
      const clientCode = (code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)).toUpperCase();

      // Check unique code per tenant
      const existing = await db.staffingClient.findFirst({
        where: { tenantId, code: clientCode },
      });
      if (existing) {
        return res.status(409).json({ error: `Client with code '${clientCode}' already exists.` });
      }

      // Validate base
      const validBases = ["GROSS_PLUS_PF", "TOTAL_CTC", "FIXED_PER_HEAD"];
      const baseKey = validBases.includes(serviceChargeBase) ? serviceChargeBase : "GROSS_PLUS_PF";

      const created = await db.staffingClient.create({
        data: {
          tenantId,
          name: name.trim(),
          code: clientCode,
          gstin: gstin ? gstin.trim().toUpperCase() : null,
          billingStateCode: billingStateCode ? billingStateCode.trim() : null,
          address: address ? address.trim() : null,
          serviceChargePct: Number(serviceChargePct) || 10.0,
          serviceChargeBase: baseKey,
          status: status || "active",
        },
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error creating client:", err);
      return res.status(500).json({ error: err.message || "Failed to create staffing client" });
    }
  }
);

/**
 * GET /api/staffing/clients/:id
 * Retrieve details of a specific staffing client
 */
contractBillingRouter.get(
  "/clients/:id",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { id } = req.params;

      const client = await db.staffingClient.findFirst({
        where: { id, tenantId },
        include: {
          employees: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              status: true,
            },
          },
        },
      });

      if (!client) {
        return res.status(404).json({ error: "Staffing client not found." });
      }

      return res.json({
        success: true,
        data: {
          ...client,
          serviceChargePct: Number(client.serviceChargePct),
        },
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error fetching client:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch staffing client" });
    }
  }
);

/**
 * PUT /api/staffing/clients/:id
 * Update commercial terms or details of a staffing client
 */
contractBillingRouter.put(
  "/clients/:id",
  requireRole(...BILLING_ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { id } = req.params;
      const { name, code, gstin, billingStateCode, address, serviceChargePct, serviceChargeBase, status } = req.body;

      const existing = await db.staffingClient.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ error: "Staffing client not found." });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (code !== undefined) updateData.code = code.trim().toUpperCase();
      if (gstin !== undefined) updateData.gstin = gstin ? gstin.trim().toUpperCase() : null;
      if (billingStateCode !== undefined) updateData.billingStateCode = billingStateCode ? billingStateCode.trim() : null;
      if (address !== undefined) updateData.address = address ? address.trim() : null;
      if (serviceChargePct !== undefined) updateData.serviceChargePct = Number(serviceChargePct);
      if (serviceChargeBase !== undefined) updateData.serviceChargeBase = serviceChargeBase;
      if (status !== undefined) updateData.status = status;

      const updated = await db.staffingClient.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        data: {
          ...updated,
          serviceChargePct: Number(updated.serviceChargePct),
        },
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error updating client:", err);
      return res.status(500).json({ error: err.message || "Failed to update staffing client" });
    }
  }
);

/**
 * POST /api/staffing/simulate-mmu
 * Test & preview MMU and GST calculation with arbitrary parameters
 */
contractBillingRouter.post(
  "/simulate-mmu",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        earnedGross = 0,
        employerPf = 0,
        billableCtc = 0,
        basis = "GROSS_PLUS_PF",
        markupPct = 10.0,
        fixedMarkupPerHead = 0,
        headcount = 1,
        supplierState = "33",
        clientState = "33",
        gstRate = 18.0,
      } = req.body;

      const mmuResult = ContractBillingService.calculateMmu({
        earnedGross: Number(earnedGross),
        employerPf: Number(employerPf),
        billableCtc: Number(billableCtc) || (Number(earnedGross) + Number(employerPf)),
        basis: basis as MarkupBasis,
        markupPct: Number(markupPct),
        fixedMarkupPerHead: Number(fixedMarkupPerHead),
        headcount: Number(headcount),
      });

      const effectiveCtc = Number(billableCtc) || (Number(earnedGross) + Number(employerPf));
      const taxableAmount = ContractBillingService.round(effectiveCtc + mmuResult.mmuAmount);

      const gstResult = ContractBillingService.calculateGst({
        taxableAmount,
        supplierState,
        clientState,
        gstRate: Number(gstRate),
        roundToInteger: true,
      });

      return res.json({
        success: true,
        simulation: {
          basis,
          markupPct: Number(markupPct),
          baseAmount: mmuResult.baseAmount,
          mmuAmount: mmuResult.mmuAmount,
          billableCtc: effectiveCtc,
          taxableAmount,
          supplyType: gstResult.supplyType,
          gstRate: Number(gstRate),
          cgst: gstResult.cgst,
          sgst: gstResult.sgst,
          igst: gstResult.igst,
          totalGst: gstResult.totalGst,
          totalInvoiceAmount: gstResult.totalInvoiceAmount,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Simulation failed" });
    }
  }
);

/**
 * GET /api/staffing/runs/:id/summary
 * Also aliased under /api/payroll/runs/:id/staffing-summary
 * Preview commercial billing by client for a payroll run
 */
contractBillingRouter.get(
  "/runs/:id/summary",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { id } = req.params;
      const { clientId } = req.query;

      const manifest = await ContractBillingService.generateRunBillingManifest(
        id,
        tenantId,
        { targetClientId: clientId as string | undefined }
      );

      return res.json({
        success: true,
        data: manifest,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error generating summary:", err);
      return res.status(500).json({ error: err.message || "Failed to generate billing summary" });
    }
  }
);

/**
 * POST /api/staffing/runs/:id/generate-invoices
 * Also aliased under /api/payroll/runs/:id/generate-invoices
 * Automatically generate draft / approved client invoices from payroll cycle
 */
contractBillingRouter.post(
  "/runs/:id/generate-invoices",
  requireRole(...BILLING_ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.id || "system";
      const { id } = req.params;
      const { clientId, status = "DRAFT", forceRegenerate = false } = req.body;

      const result = await ContractInvoiceService.generateInvoicesForPayrollRun(
        id,
        tenantId,
        actorId,
        {
          targetClientId: clientId,
          initialStatus: status as InvoiceWorkflowStatus,
          forceRegenerate,
        }
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error generating invoices:", err);
      return res.status(400).json({ error: err.message || "Failed to generate client invoices" });
    }
  }
);

/**
 * GET /api/staffing/invoices
 * List generated staffing invoices
 */
contractBillingRouter.get(
  "/invoices",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { payrollRunId, clientId, status } = req.query;

      const invoices = await ContractInvoiceService.listStaffingInvoices(
        tenantId,
        {
          payrollRunId: payrollRunId as string | undefined,
          clientId: clientId as string | undefined,
          status: status as InvoiceWorkflowStatus | undefined,
        }
      );

      return res.json({
        success: true,
        data: invoices,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error listing invoices:", err);
      return res.status(500).json({ error: err.message || "Failed to list invoices" });
    }
  }
);

/**
 * GET /api/staffing/invoices/:id
 * Retrieve specific staffing invoice with details
 */
contractBillingRouter.get(
  "/invoices/:id",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { id } = req.params;

      const sale = await db.sale.findFirst({
        where: { id, tenantId },
        include: {
          details: true,
          customer: true,
        },
      });

      if (!sale) {
        return res.status(404).json({ error: "Invoice not found." });
      }

      let meta: any = {};
      try {
        meta = sale.notes ? JSON.parse(sale.notes) : {};
      } catch {
        meta = {};
      }

      return res.json({
        success: true,
        data: {
          id: sale.id,
          invoiceNo: sale.invoiceNo,
          type: sale.type,
          customerName: sale.customerName || sale.customer?.name,
          customerGstin: sale.customerGstin,
          subtotal: Number(sale.subtotal),
          cgst: Number(sale.cgst),
          sgst: Number(sale.sgst),
          igst: Number(sale.igst),
          totalTax: Number(sale.totalTax),
          total: Number(sale.total),
          paymentStatus: sale.paymentStatus,
          workflowStatus: meta.workflowStatus || "DRAFT",
          payrollMetadata: meta,
          lineItems: sale.details.map((d) => ({
            id: d.id,
            productName: d.productName,
            sku: d.sku,
            hsnSac: d.hsnSac,
            quantity: Number(d.quantity),
            price: Number(d.price),
            subtotal: Number(d.subtotal),
            taxRate: Number(d.taxRate || 0),
            taxAmount: Number(d.taxAmount || 0),
            total: Number(d.subtotal) + Number(d.taxAmount || 0),
          })),
          createdAt: sale.createdAt,
        },
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error fetching invoice:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch invoice" });
    }
  }
);

/**
 * PATCH /api/staffing/invoices/:id/status
 * Transition invoice workflow status (DRAFT -> VALIDATED -> APPROVED -> ISSUED -> PAID / CANCELLED)
 */
contractBillingRouter.patch(
  "/invoices/:id/status",
  requireRole(...BILLING_ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.id || "system";
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Target status is required." });
      }

      const updated = await ContractInvoiceService.updateInvoiceStatus(
        id,
        tenantId,
        status as InvoiceWorkflowStatus,
        actorId,
        reason
      );

      return res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error updating invoice status:", err);
      return res.status(400).json({ error: err.message || "Failed to update invoice status" });
    }
  }
);

/**
 * GET /api/staffing/invoices/:id/reconciliation
 * Automated reconciliation check of client invoice against source payroll cycle
 */
contractBillingRouter.get(
  "/invoices/:id/reconciliation",
  requireRole(...BILLING_VIEW_ROLES),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { id } = req.params;

      const report = await ContractBillingReconciliationService.reconcileInvoiceAgainstPayroll(
        id,
        tenantId
      );

      return res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      console.error("[ContractBillingRouter] Error running reconciliation:", err);
      return res.status(500).json({ error: err.message || "Reconciliation failed" });
    }
  }
);

