import { prisma, rawPrisma } from "../prisma";

export async function migrateCrmBlobs(): Promise<{
  leadsMigrated: number;
  proposalsMigrated: number;
  dealsMigrated: number;
  contactsMigrated: number;
}> {
  const db = rawPrisma || prisma;
  console.log("🔄 Starting CRM JSON blob to relational table migration...");

  let leadsMigrated = 0;
  let proposalsMigrated = 0;
  let dealsMigrated = 0;
  let contactsMigrated = 0;

  // 1. Fetch all CMS pages related to CRM
  const cmsPages = await db.cmsPage.findMany({
    where: {
      OR: [
        { slug: { startsWith: "system-crm-leads" } },
        { slug: { startsWith: "system-proposals" } },
        { slug: { startsWith: "system-crm-deals" } },
        { slug: { startsWith: "system-crm-contacts" } },
        { slug: { startsWith: "system-crm-companies" } },
      ],
    },
  });

  const tenants = await db.tenant.findMany();
  const defaultTenantId = tenants[0]?.id || "default";

  for (const page of cmsPages) {
    let content: any = page.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        continue;
      }
    }

    // Extract tenantId from slug if structured like system-crm-leads-[tenantId]
    const slugParts = page.slug.split("-");
    const potentialTenantId = slugParts.length > 3 ? slugParts.slice(3).join("-") : defaultTenantId;
    const targetTenantId = tenants.some((t) => t.id === potentialTenantId) ? potentialTenantId : defaultTenantId;

    const items = Array.isArray(content) ? content : (Array.isArray(content?.items) ? content.items : []);
    if (!items.length) continue;

    // A. Migrate Leads
    if (page.slug.startsWith("system-crm-leads")) {
      for (const item of items) {
        const contactName = item.contactName || item.name || item.title || "Unnamed Lead";
        const title = item.title || item.name || contactName;

        const exists = await db.crmLead.findFirst({
          where: {
            tenantId: targetTenantId,
            OR: [
              { email: item.email || undefined },
              { title },
            ],
          },
        });

        if (!exists) {
          await db.crmLead.create({
            data: {
              tenantId: targetTenantId,
              title,
              contactName,
              email: item.email || null,
              phone: item.phone || null,
              company: item.company || null,
              stage: item.stage || "new",
              value: Number(item.value || 0),
              priority: item.priority || "medium",
              source: item.source || "Website",
              notes: item.notes || null,
              assignedTo: item.assignedTo || null,
            },
          });
          leadsMigrated++;
        }
      }
    }

    // B. Migrate Proposals
    if (page.slug.startsWith("system-proposals")) {
      for (const item of items) {
        const proposalNo = item.proposalNo || `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
        const exists = await db.crmProposal.findFirst({
          where: { tenantId: targetTenantId, proposalNo },
        });

        if (!exists) {
          await db.crmProposal.create({
            data: {
              tenantId: targetTenantId,
              proposalNo,
              title: item.title || "Standard Service Proposal",
              clientName: item.clientName || item.client || "Valued Client",
              clientEmail: item.clientEmail || item.email || null,
              clientGstin: item.clientGstin || null,
              status: item.status || "draft",
              amount: Number(item.amount || item.value || 0),
              items: item.items || null,
              terms: item.terms || null,
              notes: item.notes || null,
            },
          });
          proposalsMigrated++;
        }
      }
    }

    // C. Migrate Deals
    if (page.slug.startsWith("system-crm-deals")) {
      for (const item of items) {
        const name = item.name || item.title || "New Enterprise Deal";
        const exists = await db.crmDeal.findFirst({
          where: { tenantId: targetTenantId, name },
        });

        if (!exists) {
          await db.crmDeal.create({
            data: {
              tenantId: targetTenantId,
              name,
              customer: item.customer || item.client || "Prospective Client",
              stage: item.stage || "Proposal",
              value: Number(item.value || 0),
              probability: Number(item.probability || 50),
              owner: item.owner || null,
              ownerAvatar: item.ownerAvatar || null,
              status: item.status || "Open",
              notes: item.notes || null,
            },
          });
          dealsMigrated++;
        }
      }
    }

    // D. Migrate Contacts
    if (page.slug.startsWith("system-crm-contacts")) {
      for (const item of items) {
        const name = item.name || "Unnamed Contact";
        const exists = await db.crmContact.findFirst({
          where: {
            tenantId: targetTenantId,
            OR: [
              { email: item.email || undefined },
              { name },
            ],
          },
        });

        if (!exists) {
          await db.crmContact.create({
            data: {
              tenantId: targetTenantId,
              name,
              email: item.email || null,
              phone: item.phone || null,
              role: item.role || null,
              company: item.company || null,
              city: item.city || null,
              status: item.status || "active",
              notes: item.notes || null,
            },
          });
          contactsMigrated++;
        }
      }
    }
  }

  console.log(`✅ CRM Blob Migration Complete:
    - Leads: ${leadsMigrated}
    - Proposals: ${proposalsMigrated}
    - Deals: ${dealsMigrated}
    - Contacts: ${contactsMigrated}`);

  return {
    leadsMigrated,
    proposalsMigrated,
    dealsMigrated,
    contactsMigrated,
  };
}

if (require.main === module) {
  migrateCrmBlobs().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
