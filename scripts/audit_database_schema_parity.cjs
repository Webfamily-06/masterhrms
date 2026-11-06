const { PrismaClient, Prisma } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('================================================================================');
  console.log('🔍 INDEPENDENT AUDIT: PRISMA SCHEMA VS POSTGRESQL PHYSICAL METADATA');
  console.log('================================================================================\n');

  const tables = [
    { modelName: 'Branch', tableName: 'branches' },
    { modelName: 'Department', tableName: 'departments' },
    { modelName: 'Designation', tableName: 'designations' },
  ];

  const results = {};

  for (const { modelName, tableName } of tables) {
    console.log(`\n=================== [ ${modelName.toUpperCase()} -> ${tableName} ] ===================`);
    
    // 1. Physical PostgreSQL columns
    const columns = await prisma.$queryRawUnsafe(`
      SELECT 
        column_name, 
        data_type, 
        udt_name, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `);

    // 2. Physical PostgreSQL constraints
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = '${tableName}'
      ORDER BY conname;
    `);

    // 3. Physical PostgreSQL indexes
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = '${tableName}'
      ORDER BY indexname;
    `);

    // 4. Generated Prisma Client DMMF
    const dmmfModel = Prisma.dmmf?.datamodel?.models?.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );

    const dmmfScalarFields = dmmfModel?.fields
      .filter((f) => f.kind === 'scalar')
      .map((f) => ({
        name: f.name,
        type: f.type,
        isId: f.isId,
        isReadOnly: f.isReadOnly,
        hasDefault: f.hasDefaultValue,
        isUpdatedAt: f.isUpdatedAt,
        dbName: f.dbName || f.name,
      }));

    const dmmfRelationFields = dmmfModel?.fields
      .filter((f) => f.kind === 'object')
      .map((f) => ({
        name: f.name,
        type: f.type,
        isList: f.isList,
        relationFromFields: f.relationFromFields,
        relationToFields: f.relationToFields,
      }));

    // Parity comparison
    const physicalColNames = columns.map((c) => c.column_name);
    const prismaDbNames = dmmfScalarFields.map((f) => f.dbName);

    const inPrismaNotInDb = prismaDbNames.filter((name) => !physicalColNames.includes(name));
    const inDbNotInPrisma = physicalColNames.filter((name) => !prismaDbNames.includes(name));

    results[modelName] = {
      tableName,
      columns,
      constraints,
      indexes,
      dmmfScalarFields,
      dmmfRelationFields,
      parity: {
        inPrismaNotInDb,
        inDbNotInPrisma,
        hasStatusInDb: physicalColNames.includes('status'),
        hasStatusInPrisma: dmmfScalarFields.some((f) => f.name === 'status'),
        hasUpdatedAtInDb: physicalColNames.includes('updated_at'),
        hasUpdatedAtInPrisma: dmmfScalarFields.some((f) => f.name === 'updatedAt'),
        hasUpdatedByInDb: physicalColNames.includes('updated_by') || physicalColNames.includes('updatedBy'),
        hasUpdatedByInPrisma: dmmfScalarFields.some((f) => f.name === 'updatedBy'),
      },
    };

    console.log(`\nColumns in PostgreSQL (${columns.length}):`);
    console.table(columns.map(c => ({ column: c.column_name, type: c.data_type, nullable: c.is_nullable, default: c.column_default })));

    console.log(`\nPrisma Scalar Fields (${dmmfScalarFields.length}):`);
    console.table(dmmfScalarFields.map(f => ({ name: f.name, dbName: f.dbName, type: f.type, isUpdatedAt: f.isUpdatedAt })));

    console.log(`\nConstraints (${constraints.length}):`);
    constraints.forEach(c => console.log(`  - [${c.constraint_type}] ${c.constraint_name}: ${c.constraint_definition}`));

    console.log(`\nIndexes (${indexes.length}):`);
    indexes.forEach(i => console.log(`  - ${i.indexname}: ${i.indexdef}`));

    console.log('\n--- Parity Audit Summary ---');
    console.log('Fields in Prisma but absent from PostgreSQL:', inPrismaNotInDb);
    console.log('Fields in PostgreSQL but absent from Prisma:', inDbNotInPrisma);
    console.log(`Supports status: DB=${results[modelName].parity.hasStatusInDb}, Prisma=${results[modelName].parity.hasStatusInPrisma}`);
    console.log(`Supports updatedAt/updated_at: DB=${results[modelName].parity.hasUpdatedAtInDb}, Prisma=${results[modelName].parity.hasUpdatedAtInPrisma}`);
    console.log(`Supports updatedBy/updated_by: DB=${results[modelName].parity.hasUpdatedByInDb}, Prisma=${results[modelName].parity.hasUpdatedByInPrisma}`);
  }

  // Save audit data to a JSON artifact for reporting
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/audit_database_schema_parity.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log('\nAudit data saved to scripts/audit_database_schema_parity.json');
}

audit()
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

