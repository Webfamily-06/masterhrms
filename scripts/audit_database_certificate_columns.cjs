const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = ['organization_branding_assets', 'organization_signatories', 'certificate_templates', 'employee_award_certificates', 'media_files'];
  for (const t of tables) {
    console.log(`\n=== Table: ${t} ===`);
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, t);
    console.log(cols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join(', '));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
