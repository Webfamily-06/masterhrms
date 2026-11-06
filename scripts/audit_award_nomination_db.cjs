const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== CHECKING PHYSICAL DATABASE TABLES IN SUPABASE POSTGRESQL ===');
  
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'workflow_definitions', 
        'workflow_steps', 
        'approval_requests', 
        'approval_actions', 
        'approval_delegations',
        'notifications', 
        'award_types', 
        'employee_awards', 
        'award_nominations',
        'award_approval_steps',
        'award_approval_histories',
        'award_recognition_policies'
      )
    ORDER BY table_name
  `);
  console.log('Physical tables found:', tables);

  // Check columns for workflow_definitions, workflow_steps, approval_requests, approval_actions
  for (const t of ['workflow_definitions', 'workflow_steps', 'approval_requests', 'approval_actions', 'award_types', 'employee_awards']) {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, t);
    console.log(`\nColumns for ${t}:`, cols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));
  }

  // Check existing workflow definitions
  const workflows = await prisma.$queryRawUnsafe(`
    SELECT id, tenant_id, entity_type, name, is_active
    FROM workflow_definitions
    LIMIT 10
  `);
  console.log('\nSample Workflow Definitions in DB:', workflows);

  // Check existing approval requests
  const approvalRequests = await prisma.$queryRawUnsafe(`
    SELECT id, tenant_id, entity_type, entity_id, current_step, status
    FROM approval_requests
    LIMIT 10
  `);
  console.log('\nSample Approval Requests in DB:', approvalRequests);

  // Check employee reporting relations
  const managerCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name LIKE '%manager%' OR column_name LIKE '%reports%'
  `);
  console.log('\nEmployee manager columns:', managerCols);

  await prisma.$disconnect();
}

check().catch(err => {
  console.error('Error running audit check:', err);
  process.exit(1);
});
