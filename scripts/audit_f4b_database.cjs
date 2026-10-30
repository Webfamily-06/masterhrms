const { PrismaClient } = require("../server/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function audit() {
  console.log("=== F4-B Database State Forensic Audit ===");
  
  // 1. Quota & Usage tenant_pool vs null
  const qTenantPool = await prisma.storageQuota.count({ where: { userId: "tenant_pool" } });
  const qNull = await prisma.storageQuota.count({ where: { userId: null } });
  const uTenantPool = await prisma.storageUsage.count({ where: { userId: "tenant_pool" } });
  const uNull = await prisma.storageUsage.count({ where: { userId: null } });
  
  console.log({
    storageQuota: { tenant_pool: qTenantPool, null_user: qNull },
    storageUsage: { tenant_pool: uTenantPool, null_user: uNull },
  });

  // Check if any tenants have BOTH a 'tenant_pool' row and a null row
  const qAll = await prisma.storageQuota.findMany({
    where: { OR: [{ userId: "tenant_pool" }, { userId: null }] },
    select: { tenantId: true, userId: true, quotaBytes: true },
  });
  const uAll = await prisma.storageUsage.findMany({
    where: { OR: [{ userId: "tenant_pool" }, { userId: null }] },
    select: { tenantId: true, userId: true, usedBytes: true, trashBytes: true, reservedBytes: true },
  });

  const qMap = new Map();
  let qCollisions = 0;
  for (const q of qAll) {
    if (!qMap.has(q.tenantId)) qMap.set(q.tenantId, []);
    qMap.get(q.tenantId).push(q);
    if (qMap.get(q.tenantId).length > 1) qCollisions++;
  }

  const uMap = new Map();
  let uCollisions = 0;
  for (const u of uAll) {
    if (!uMap.has(u.tenantId)) uMap.set(u.tenantId, []);
    uMap.get(u.tenantId).push(u);
    if (uMap.get(u.tenantId).length > 1) uCollisions++;
  }

  console.log("Collisions where both tenant_pool and null exist for same tenant:");
  console.log({ qCollisions, uCollisions });

  // 2. MediaFile fileSize check
  const mediaCount = await prisma.mediaFile.count();
  const maxFileSizeRow = await prisma.mediaFile.findFirst({
    orderBy: { fileSize: "desc" },
    select: { id: true, fileName: true, fileSize: true },
  });
  console.log("MediaFile count:", mediaCount, "Max fileSize:", maxFileSizeRow);

  // 3. Raw column type check in PostgreSQL information_schema
  const rawColumnTypes = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name IN ('media_files', 'file_versions', 'storage_usages', 'storage_quotas', 'file_upload_sessions')
      AND column_name IN ('file_size', 'size_bytes', 'used_bytes', 'trash_bytes', 'reserved_bytes', 'quota_bytes');
  `;
  console.log("PostgreSQL Physical Column Types:\n", rawColumnTypes);

  // 4. Check FileUploadSession state
  const sessionStats = await prisma.fileUploadSession.groupBy({
    by: ['status'],
    _count: { id: true },
    _sum: { sizeBytes: true },
  });
  console.log("FileUploadSessions by status:\n", sessionStats);

  // 5. Check platform media files (tenantId IS NULL)
  const platformFiles = await prisma.mediaFile.count({ where: { tenantId: null } });
  console.log("Platform files (tenantId is null):", platformFiles);
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

