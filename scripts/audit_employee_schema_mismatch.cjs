const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schema = fs.readFileSync('server/prisma/schema.prisma', 'utf8');
  const empModelMatch = schema.match(/model Employee \{([\s\S]*?)\n\}/);
  if (!empModelMatch) return console.log('Could not match Employee model');
  
  const lines = empModelMatch[1].split('\n');
  const prismaFields = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
    const parts = trimmed.split(/\s+/);
    const fieldName = parts[0];
    const fieldType = parts[1];
    const mapMatch = trimmed.match(/@map\("([^"]+)"\)/);
    const colName = mapMatch ? mapMatch[1] : fieldName;
    // Check if scalar
    if (['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'EmployeeStatus', 'EmploymentType'].includes(fieldType.replace('?', ''))) {
      prismaFields.push({ fieldName, colName, fieldType, raw: trimmed });
    }
  }

  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'employees'
  `);
  const physColNames = new Set(cols.map(c => c.column_name));

  console.log('--- MISSING IN PHYSICAL DB ---');
  const missing = [];
  for (const pf of prismaFields) {
    if (!physColNames.has(pf.colName)) {
      missing.push(pf);
      console.log('MISSING:', pf.colName, '(' + pf.fieldName + ')', 'Type:', pf.fieldType);
    }
  }

  console.log('\n--- EXTRA IN PHYSICAL DB (NOT IN PRISMA) ---');
  const prismaColNames = new Set(prismaFields.map(pf => pf.colName));
  for (const c of cols) {
    if (!prismaColNames.has(c.column_name)) {
      console.log('PHYSICAL EXTRA:', c.column_name, c.data_type);
    }
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());

