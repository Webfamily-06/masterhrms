const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function baseline() {
  const mediaCount = await prisma.mediaFile.count();
  const usageCount = await prisma.mediaUsage.count();
  const companyDocCount = await prisma.companyDocument.count();

  const chatMsgsWithMedia = await prisma.chatMessage.count({
    where: {
      attachments: { not: null }
    }
  });

  const brandingSettings = await prisma.mediaUsage.findMany({
    where: { entityType: "setting" },
    select: { mediaId: true, fieldKey: true, entityId: true }
  });

  const folders = await prisma.mediaFile.groupBy({
    by: ["folder"],
    _count: { id: true }
  });

  const baselineData = {
    timestamp: new Date().toISOString(),
    mediaCount,
    usageCount,
    companyDocCount,
    chatMsgsWithMedia,
    brandingSettingsCount: brandingSettings.length,
    folders
  };

  console.log("=== PRE-MIGRATION BASELINE ===");
  console.log(JSON.stringify(baselineData, null, 2));

  const fs = require("fs");
  fs.writeFileSync(path.join(__dirname, "media_baseline.json"), JSON.stringify(baselineData, null, 2));
}

baseline().finally(() => prisma.$disconnect());

