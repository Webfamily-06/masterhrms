import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import path from "path";

export async function runBackfill() {
  console.log("================================================================================");
  console.log("STARTING FILE MANAGER & MEDIA LIBRARY MIGRATION BACKFILL");
  console.log("================================================================================\n");

  const mediaFiles = await prisma.mediaFile.findMany();
  console.log(`[BACKFILL] Found ${mediaFiles.length} media_files records to reconcile.`);

  let updatedNodesCount = 0;
  let createdVersionsCount = 0;

  for (const file of mediaFiles) {
    const originalName = file.fileName || "unnamed_file";
    const nameKey = originalName.trim().toLowerCase();
    const ext = path.extname(originalName).replace(".", "").toLowerCase();
    const isTrashed = !!file.deletedAt;
    const status = isTrashed ? "TRASHED" : "ACTIVE";
    const ownerType = file.tenantId ? "USER" : "SYSTEM";
    const ownerId = file.uploadedBy || file.tenantId || "system";
    const type = file.isFolder ? "FOLDER" : "FILE";

    // Update MediaFile node with F1 properties
    await prisma.mediaFile.update({
      where: { id: file.id },
      data: {
        nameKey,
        extension: ext,
        type,
        ownerType,
        ownerId,
        status,
        trashedAt: file.deletedAt || null,
        materializedPath: file.parentId ? `/${file.parentId}/${file.id}` : `/${file.id}`,
        depth: file.parentId ? 1 : 0,
      },
    });
    updatedNodesCount++;

    // If it's a file, ensure initial FileVersion (v1) exists
    if (!file.isFolder) {
      const existingVersion = await prisma.fileVersion.findUnique({
        where: {
          fileId_versionNo: {
            fileId: file.id,
            versionNo: 1,
          },
        },
      });

      if (!existingVersion) {
        const v1 = await prisma.fileVersion.create({
          data: {
            fileId: file.id,
            versionNo: 1,
            storageKey: file.filePath || `uploads/${file.id}`,
            sizeBytes: BigInt(file.fileSize || 0),
            checksum: file.checksumSha || null,
            createdBy: file.uploadedBy || "system",
            isCurrent: true,
          },
        });

        await prisma.mediaFile.update({
          where: { id: file.id },
          data: { currentVersionId: v1.id },
        });
        createdVersionsCount++;
      }
    }
  }

  console.log(`[BACKFILL] Successfully updated ${updatedNodesCount} MediaFile nodes.`);
  console.log(`[BACKFILL] Created ${createdVersionsCount} initial FileVersion records.`);

  // 2. Reconcile MediaUsages -> FileLinks
  const mediaUsages = await prisma.mediaUsage.findMany();
  console.log(`\n[BACKFILL] Found ${mediaUsages.length} media_usages records to map to FileLinks.`);
  let createdLinksCount = 0;

  for (const usage of mediaUsages) {
    const existingLink = await prisma.fileLink.findFirst({
      where: {
        fileId: usage.mediaId,
        entityType: usage.entityType,
        entityId: usage.entityId,
        fieldKey: usage.fieldKey,
      },
    });

    if (!existingLink) {
      await prisma.fileLink.create({
        data: {
          fileId: usage.mediaId,
          module: usage.entityType,
          pageKey: usage.fieldKey,
          entityType: usage.entityType,
          entityId: usage.entityId,
          fieldKey: usage.fieldKey,
          linkedBy: "system",
        },
      });
      createdLinksCount++;
    }
  }
  console.log(`[BACKFILL] Created ${createdLinksCount} FileLink records.`);

  // 3. Compute and populate StorageUsage & StorageQuota per tenant
  console.log("\n[BACKFILL] Computing storage usages and quotas per tenant...");
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  // Plan capacity map (in GB)
  const PLAN_CAPACITIES_GB: Record<string, number> = {
    starter: 10,
    growth: 25,
    sovereign: 100,
    "custom-flex": 500,
  };

  for (const tenant of tenants) {
    const tenantId = tenant.id;

    // Active files bytes
    const activeFiles = await prisma.mediaFile.findMany({
      where: { tenantId, deletedAt: null, isFolder: false },
      select: { fileSize: true },
    });
    const usedBytes = activeFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));
    const fileCount = activeFiles.length;

    // Trashed files bytes
    const trashedFiles = await prisma.mediaFile.findMany({
      where: { tenantId, deletedAt: { not: null }, isFolder: false },
      select: { fileSize: true },
    });
    const trashBytes = trashedFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));

    // Upsert tenant storage usage
    await prisma.storageUsage.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: "tenant_pool",
        },
      },
      create: {
        tenantId,
        userId: "tenant_pool",
        usedBytes,
        trashBytes,
        fileCount,
      },
      update: {
        usedBytes,
        trashBytes,
        fileCount,
      },
    });

    // Resolve tenant plan quota
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    let quotaGb = 10;
    if (subscription?.storageLimitGb) {
      quotaGb = subscription.storageLimitGb;
    } else if (subscription?.planId && PLAN_CAPACITIES_GB[subscription.planId]) {
      quotaGb = PLAN_CAPACITIES_GB[subscription.planId];
    }

    const quotaBytes = BigInt(quotaGb) * BigInt(1024 * 1024 * 1024);

    await prisma.storageQuota.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: "tenant_pool",
        },
      },
      create: {
        tenantId,
        userId: "tenant_pool",
        quotaBytes,
        source: subscription?.planId ? "PLAN" : "DEFAULT",
      },
      update: {
        quotaBytes,
        source: subscription?.planId ? "PLAN" : "DEFAULT",
      },
    });
  }

  console.log(`[BACKFILL] Processed storage usages and quotas for ${tenants.length} tenants.`);
  console.log("\n================================================================================");
  console.log("BACKFILL MIGRATION COMPLETE");
  console.log("================================================================================\n");
}

if (require.main === module) {
  runBackfill()
    .catch((err) => {
      console.error("FATAL ERROR IN BACKFILL:", err);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}

