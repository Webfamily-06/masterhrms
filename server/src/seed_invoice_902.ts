import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "tenant-default-001";

  // 1. Ensure Customer 'Sara Inc.' exists
  let customer = await prisma.customer.findFirst({
    where: { tenantId, name: { contains: "Sara" } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        name: "Sara Inc.",
        email: "sara_inc34@example.com",
        phone: "+1 987 471 6589",
        gstin: "07AAACA1234A1Z5",
        address: "3103 Trainer Avenue, Peoria, IL 61602",
        country: "India",
      },
    });
    console.log("Created customer Sara Inc:", customer.id);
  } else {
    console.log("Found existing customer Sara Inc:", customer.id);
  }

  // 2. Ensure Warehouse exists
  let warehouse = await prisma.warehouse.findFirst({
    where: { tenantId },
  });

  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        tenantId,
        name: "Main Central Warehouse",
        location: "Corporate Central Park",
        city: "Bengaluru",
        isDefault: true,
      },
    });
    console.log("Created warehouse:", warehouse.id);
  }

  // 3. Ensure Products exist
  const items = [
    { name: "UX Strategy", code: "PROD-UX-01", price: 500, taxRate: 5, hsn: "998313" },
    { name: "Design System", code: "PROD-DS-02", price: 2000, taxRate: 5, hsn: "998314" },
    { name: "Brand Guidelines", code: "PROD-BG-03", price: 1500, taxRate: 5, hsn: "998315" },
    { name: "Social Media Template", code: "PROD-SM-04", price: 1500, taxRate: 5, hsn: "998316" },
  ];

  const productRecords = [];
  for (const itm of items) {
    let prod = await prisma.product.findFirst({
      where: { tenantId, name: itm.name },
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          tenantId,
          name: itm.name,
          sku: itm.code,
          barcode: itm.code,
          hsnSac: itm.hsn,
          salePrice: itm.price,
          purchasePrice: itm.price * 0.5,
          isActive: true,
        },
      });
      console.log(`Created product ${itm.name}:`, prod.id);
    }
    productRecords.push({ ...itm, product: prod });
  }

  // 4. Upsert Invoice 'INV-2026-902'
  let sale = await prisma.sale.findFirst({
    where: { tenantId, invoiceNo: "INV-2026-902" },
    include: { details: true, payments: true },
  });

  if (sale) {
    console.log("Invoice INV-2026-902 already exists. Deleting to re-create fresh test state...");
    await prisma.salePayment.deleteMany({ where: { saleId: sale.id } });
    await prisma.saleDetail.deleteMany({ where: { saleId: sale.id } });
    await prisma.sale.delete({ where: { id: sale.id } });
  }

  sale = await prisma.sale.create({
    data: {
      tenantId,
      invoiceNo: "INV-2026-902",
      type: "invoice",
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin,
      warehouseId: warehouse.id,
      subtotal: 5500,
      discountPct: 0,
      discountAmt: 0,
      taxMode: "sgst_cgst",
      cgst: 137.5,
      sgst: 137.5,
      igst: 0,
      totalTax: 275,
      total: 5775,
      paidAmount: 0,
      paymentStatus: "unpaid",
      notes: "Design & development of Website. Please quote invoice number when remitting funds.",
      date: new Date("2026-09-24T00:00:00Z"),
      dueDate: new Date("2026-09-30T00:00:00Z"),
      details: {
        create: productRecords.map((p) => ({
          productId: p.product.id,
          productName: p.name,
          sku: p.product.sku,
          hsnSac: p.hsn,
          unit: "Pcs",
          price: p.price,
          quantity: 1,
          taxRate: p.taxRate,
          taxAmount: (p.price * p.taxRate) / 100,
          discount: 0,
          subtotal: p.price,
        })),
      },
    },
    include: {
      details: true,
      payments: true,
      customer: true,
    },
  });

  console.log("Successfully created invoice INV-2026-902:", {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    customer: sale.customerName,
    subtotal: sale.subtotal,
    tax: sale.totalTax,
    total: sale.total,
    detailsCount: sale.details.length,
  });
}

main()
  .catch((e) => {
    console.error("Error seeding invoice:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
