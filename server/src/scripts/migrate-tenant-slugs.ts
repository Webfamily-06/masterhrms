import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { rawPrisma } from "../prisma";
import { validateWorkspaceSlug, suggestWorkspaceSlug } from "../lib/workspace-host";

async function main() {
  const tenants = await rawPrisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${tenants.length} tenants in database.`);

  const usedSlugs = new Set<string>();

  for (const t of tenants) {
    let currentSlug = t.slug;

    // Special case for seed/demo tenant: use "master"
    if (t.id === "tenant-default-001") {
      currentSlug = "master";
    }

    let validation = validateWorkspaceSlug(currentSlug);
    let finalSlug = currentSlug;

    if (!validation.valid || usedSlugs.has(currentSlug.toLowerCase())) {
      let base = suggestWorkspaceSlug(t.name || "company");
      if (base === "default" || base === "super" || base === "admin") {
        base = "company";
      }
      let candidate = base;
      let counter = 2;
      while (usedSlugs.has(candidate.toLowerCase()) || !validateWorkspaceSlug(candidate).valid) {
        candidate = `${base.substring(0, 27)}-${counter}`;
        counter++;
      }
      finalSlug = candidate;
      console.log(`Migrating tenant ${t.id} ("${t.name}") slug from "${t.slug}" -> "${finalSlug}"`);
      await rawPrisma.tenant.update({
        where: { id: t.id },
        data: { slug: finalSlug },
      });
    } else {
      if (currentSlug !== t.slug) {
        console.log(`Updating tenant ${t.id} slug to "${finalSlug}"`);
        await rawPrisma.tenant.update({
          where: { id: t.id },
          data: { slug: finalSlug },
        });
      } else {
        console.log(`Tenant ${t.id} ("${t.name}") has valid slug: "${finalSlug}"`);
      }
    }

    usedSlugs.add(finalSlug.toLowerCase());
  }

  // Ensure test tenants "acme" and "beta" exist with user accounts for isolation tests
  let acme = await rawPrisma.tenant.findUnique({ where: { slug: "acme" } });
  if (!acme) {
    console.log("Creating test tenant 'acme'...");
    acme = await rawPrisma.tenant.create({
      data: {
        id: "tenant-acme-test",
        name: "Acme Corporation",
        slug: "acme",
      },
    });
    const plan = await rawPrisma.subscriptionPlan.findFirst();
    if (plan) {
      await rawPrisma.tenantSubscription.create({
        data: {
          tenantId: acme.id,
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  let beta = await rawPrisma.tenant.findUnique({ where: { slug: "beta" } });
  if (!beta) {
    console.log("Creating test tenant 'beta'...");
    beta = await rawPrisma.tenant.create({
      data: {
        id: "tenant-beta-test",
        name: "Beta Technologies",
        slug: "beta",
      },
    });
    const plan = await rawPrisma.subscriptionPlan.findFirst();
    if (plan) {
      await rawPrisma.tenantSubscription.create({
        data: {
          tenantId: beta.id,
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log("Tenant slugs verified and migrated successfully.");
  await rawPrisma.$disconnect();
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
