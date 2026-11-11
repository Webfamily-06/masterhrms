const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dryRun() {
  const templates = await prisma.certificateTemplate.findMany({
    include: { versions: { orderBy: { versionNumber: 'desc' } } }
  });

  console.log(`Auditing ${templates.length} templates for normalization dry run...`);

  let modifiedCount = 0;
  let populatedEmptyCount = 0;
  let enrichedSparseCount = 0;

  for (const t of templates) {
    const version = t.versions?.[0];
    let design = version?.designJson || t.designJson || {};
    let elements = Array.isArray(design.elements) ? [...design.elements] : [];

    if (elements.length === 0) {
      populatedEmptyCount++;
    } else if (elements.length <= 5) {
      enrichedSparseCount++;
    } else {
      modifiedCount++;
    }
  }

  console.log(`Results:`);
  console.log(` - Completely empty templates to populate: ${populatedEmptyCount}`);
  console.log(` - Sparse templates to enrich: ${enrichedSparseCount}`);
  console.log(` - Standard templates to normalize tokens/signatories: ${modifiedCount}`);
  console.log(` - Total to process: ${populatedEmptyCount + enrichedSparseCount + modifiedCount} / ${templates.length}`);
}

dryRun().catch(console.error).finally(() => prisma.$disconnect());

