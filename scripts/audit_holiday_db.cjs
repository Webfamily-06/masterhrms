const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting Holidays Table Columns ---');
  const holidayCols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'holidays'
    ORDER BY ordinal_position;
  `;
  console.log(JSON.stringify(holidayCols, null, 2));

  console.log('\n--- Inspecting CalendarEvent Table Columns ---');
  const calCols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'calendar_events'
    ORDER BY ordinal_position;
  `;
  console.log(JSON.stringify(calCols, null, 2));

  console.log('\n--- Inspecting HolidayType / Categories Tables ---');
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name ILIKE '%holiday%' OR table_name ILIKE '%calendar%');
  `;
  console.log('Related Tables:', tables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
