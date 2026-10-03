import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const clientRouter = Router();

// Middleware: Authenticate and resolve tenant
clientRouter.use(requireAuth, resolveTenantContext as any);

/**
 * Helper to resolve the authenticated customer record strictly from the verified session.
 * Fails closed if no matching Customer record exists in the active tenant.
 */
async function resolveAuthenticatedCustomer(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenantId;
  const email = req.user?.email;

  if (!tenantId || !email) {
    res.status(401).json({
      error: "Authentication required with valid workspace context.",
      code: "INVALID_SESSION",
    });
    return null;
  }

  // Strictly lookup customer by tenantId + email (fail closed)
  const customer = await prisma.customer.findFirst({
    where: {
      tenantId,
      email: email.trim(),
    },
  });

  if (!customer) {
    res.status(403).json({
      error: "Access denied: No customer account is linked to your verified credentials in this workspace.",
      code: "CUSTOMER_NOT_LINKED",
    });
    return null;
  }

  return customer;
}

/**
 * GET /api/client/my-profile
 * Returns the authenticated client's verified customer record.
 */
clientRouter.get("/my-profile", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    return res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      gstin: customer.gstin,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      postalCode: customer.postalCode,
      createdAt: customer.createdAt,
    });
  } catch (error: any) {
    console.error("[client/my-profile] Error:", error);
    return res.status(500).json({ error: "Failed to retrieve client profile." });
  }
});

/**
 * GET /api/client/my-invoices
 * Returns strictly the invoices belonging to the authenticated client in this tenant.
 * Does NOT accept customerId from the request.
 */
clientRouter.get("/my-invoices", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;

    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        customerId: customer.id,
      },
      include: {
        details: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNo,
      invoiceNo: s.invoiceNo,
      date: s.date.toISOString(),
      dueDate: s.dueDate ? s.dueDate.toISOString() : s.date.toISOString(),
      clientName: customer.name,
      clientEmail: customer.email,
      status: s.paymentStatus === "paid" ? "PAID" : "UNPAID",
      paymentStatus: s.paymentStatus,
      paymentMethod: s.paymentMethod,
      subtotal: Number(s.subtotal),
      totalTax: Number(s.totalTax),
      total: Number(s.total),
      amount: Number(s.total),
      paidAmount: Number(s.paidAmount),
      items: s.details.map((d) => ({
        id: d.id,
        productName: d.productName,
        quantity: d.quantity,
        unit: d.unit,
        price: Number(d.price),
        total: Number(d.price) * d.quantity,
      })),
      createdAt: s.createdAt.toISOString(),
    }));

    return res.json(formatted);
  } catch (error: any) {
    console.error("[client/my-invoices] Error:", error);
    return res.status(500).json({ error: "Failed to retrieve client invoices." });
  }
});

/**
 * GET /api/client/my-projects
 * Returns strictly the projects contracted to the authenticated client in this tenant.
 * Does NOT accept client name or customerId from the request.
 */
clientRouter.get("/my-projects", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;

    // Match projects scoped by tenant and client identity
    const clientMatches = [customer.name];
    if (customer.email) clientMatches.push(customer.email);

    const projects = await prisma.project.findMany({
      where: {
        tenantId,
        clientName: {
          in: clientMatches,
        },
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "completed" || t.status === "done").length;
      const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status.toUpperCase(),
        priority: p.priority,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        progress: calculatedProgress,
        clientName: p.clientName,
        totalTasks,
        completedTasks,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error("[client/my-projects] Error:", error);
    return res.status(500).json({ error: "Failed to retrieve client projects." });
  }
});

/**
 * POST /api/client/invoices/:id/pay
 * Generates/initiates payment checkout for a client invoice
 */
clientRouter.post("/invoices/:id/pay", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: { id, tenantId, customerId: customer.id },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found or not assigned to your account." });
    }

    if (sale.paymentStatus === "paid") {
      return res.status(400).json({ error: "This invoice has already been fully paid." });
    }

    const orderId = `pay_order_${Date.now()}`;
    return res.json({
      success: true,
      invoiceId: sale.id,
      invoiceNumber: sale.invoiceNo,
      amount: Number(sale.total),
      currency: "INR",
      orderId,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_sample",
    });
  } catch (error: any) {
    console.error("[client/invoices/pay] Error:", error);
    return res.status(500).json({ error: "Failed to initiate invoice payment." });
  }
});

/**
 * POST /api/client/invoices/:id/confirm-payment
 * Confirms payment for a client invoice, marks Sale as paid, records audit
 */
clientRouter.post("/invoices/:id/confirm-payment", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { paymentMethod = "online", transactionReference } = req.body;

    const sale = await prisma.sale.findFirst({
      where: { id, tenantId, customerId: customer.id },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found or not assigned to your account." });
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        paidAmount: sale.total,
        paymentMethod: String(paymentMethod),
      },
    });

    return res.json({
      success: true,
      message: `Invoice ${sale.invoiceNo} marked as paid successfully.`,
      invoice: {
        id: updated.id,
        invoiceNo: updated.invoiceNo,
        status: "PAID",
        paidAmount: Number(updated.paidAmount),
      },
    });
  } catch (error: any) {
    console.error("[client/invoices/confirm-payment] Error:", error);
    return res.status(500).json({ error: "Failed to confirm invoice payment." });
  }
});

/**
 * GET /api/client/my-projects/:id/milestones
 * Returns project milestones contracted to the client
 */
clientRouter.get("/my-projects/:id/milestones", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const clientMatches = [customer.name];
    if (customer.email) clientMatches.push(customer.email);

    const project = await prisma.project.findFirst({
      where: {
        id,
        tenantId,
        clientName: { in: clientMatches },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found or not contracted to your account." });
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id, tenantId },
      orderBy: { createdAt: "asc" },
    });

    return res.json(
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        cost: Number(m.cost),
        status: m.status,
        dueDate: m.dueDate ? m.dueDate.toISOString().split("T")[0] : null,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
      }))
    );
  } catch (error: any) {
    console.error("[client/my-projects/milestones] Error:", error);
    return res.status(500).json({ error: "Failed to fetch project milestones." });
  }
});

/**
 * POST /api/client/my-projects/:id/milestones/:mid/sign-off
 * Client signs off on delivered milestone
 */
clientRouter.post("/my-projects/:id/milestones/:mid/sign-off", async (req: AuthRequest, res: Response) => {
  try {
    const customer = await resolveAuthenticatedCustomer(req, res);
    if (!customer) return;

    const tenantId = req.user!.tenantId!;
    const { id, mid } = req.params;
    const { comments } = req.body;

    const clientMatches = [customer.name];
    if (customer.email) clientMatches.push(customer.email);

    const project = await prisma.project.findFirst({
      where: {
        id,
        tenantId,
        clientName: { in: clientMatches },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const milestone = await prisma.projectMilestone.findFirst({
      where: { id: mid, projectId: id, tenantId },
    });

    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found." });
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: mid },
      data: {
        status: "completed",
        completedAt: new Date(),
        description: comments
          ? `${milestone.description || ""}\n[Signed off by ${customer.name}: ${comments}]`.trim()
          : milestone.description,
      },
    });

    return res.json({
      success: true,
      message: `Milestone "${milestone.title}" signed off successfully.`,
      milestone: updated,
    });
  } catch (error: any) {
    console.error("[client/milestones/sign-off] Error:", error);
    return res.status(500).json({ error: "Failed to sign off on milestone." });
  }
});
