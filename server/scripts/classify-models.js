const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const modelBlocks = schema.split(/model\s+/).slice(1);

const results = [];

for (const block of modelBlocks) {
  const modelName = block.split(/\s+/)[0];
  const body = block.substring(block.indexOf('{') + 1, block.indexOf('}'));
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  
  const hasTenantId = lines.some(l => /^tenantId\s+/i.test(l) || /^tenant_id\s+/i.test(l));
  
  // Find relations
  const relationFields = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const fieldName = parts[0];
    const fieldType = parts[1];
    if (line.includes('@relation')) {
      relationFields.push({ fieldName, fieldType, raw: line });
    }
  }

  results.push({
    name: modelName,
    hasTenantId,
    relationFields
  });
}

console.log('TOTAL MODELS:', results.length);
const directTenant = results.filter(r => r.hasTenantId).map(r => r.name);
const nonTenant = results.filter(r => !r.hasTenantId);

console.log('DIRECT TENANT MODELS (' + directTenant.length + '):');
console.log(JSON.stringify(directTenant, null, 2));

console.log('\nNON DIRECT TENANT MODELS (' + nonTenant.length + '):');
for (const m of nonTenant) {
  console.log(`- ${m.name}: relations = ${m.relationFields.map(r => r.fieldName + '->' + r.fieldType).join(', ')}`);
}
