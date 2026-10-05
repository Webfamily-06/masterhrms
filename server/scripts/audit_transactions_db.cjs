const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const billingInvoices = await prisma.billingInvoice.findMany({
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      subscription: { include: { plan: true } }
    }
  });

  const gatewayTxns = await prisma.paymentGatewayTransaction.findMany({
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      sale: true
    }
  });

  console.log('=== BILLING INVOICES (' + billingInvoices.length + ') ===');
  for (const inv of billingInvoices) {
    console.log(JSON.stringify({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      amount: inv.amount,
      currency: inv.currency,
      paymentMethod: inv.paymentMethod,
      gatewayOrderId: inv.gatewayOrderId,
      gatewayPaymentId: inv.gatewayPaymentId,
      status: inv.status,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      tenant: inv.tenant?.name
    }, null, 2));
  }

  console.log('=== PAYMENT GATEWAY TRANSACTIONS (' + gatewayTxns.length + ') ===');
  for (const tx of gatewayTxns) {
    console.log(JSON.stringify({
      id: tx.id,
      providerOrderId: tx.providerOrderId,
      providerPaymentId: tx.providerPaymentId,
      amount: tx.amount,
      currency: tx.currency,
      provider: tx.provider,
      method: tx.method,
      status: tx.status,
      verifiedAt: tx.verifiedAt,
      createdAt: tx.createdAt,
      payload: tx.payload,
      tenant: tx.tenant?.name,
      sale: tx.sale ? { id: tx.sale.id, refNo: tx.sale.refNo } : null
    }, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
