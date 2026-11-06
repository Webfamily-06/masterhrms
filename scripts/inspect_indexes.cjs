const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'employee_award_certificates';`
  .then(r => {
    console.log(JSON.stringify(r, null, 2));
    p.$disconnect();
  });

