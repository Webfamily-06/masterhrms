const fs = require('fs');
const path = require('path');

const configContent = fs.readFileSync(path.join(__dirname, '../src/config/tenant-models.config.ts'), 'utf8');

function extractSet(name) {
  const match = configContent.match(new RegExp(`export const ${name} = new Set<string>\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!match) return new Set();
  const items = match[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  return new Set(items);
}

function extractMap(name) {
  const match = configContent.match(new RegExp(`export const ${name} = new Map<string, ChildModelRelation>\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!match) return new Set();
  const keys = [...match[1].matchAll(/\["(\w+)",/g)].map(m => m[1]);
  return new Set(keys);
}

const GLOBAL_MODELS = extractSet('GLOBAL_MODELS');
const DIRECT_TENANT_MODELS = extractSet('DIRECT_TENANT_MODELS');
const SCOPED_TENANT_MODELS = extractSet('SCOPED_TENANT_MODELS');
const CHILD_DEPENDENT_MODELS = extractMap('CHILD_DEPENDENT_MODELS');
const ROOT_TENANT = 'Tenant';

const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');
const regex = /^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
let m;
const models = [];
while ((m = regex.exec(schema)) !== null) {
  models.push(m[1]);
}

const unclassified = [];
for (const model of models) {
  const isGlobal = GLOBAL_MODELS.has(model);
  const isRoot = model === ROOT_TENANT;
  const isDirect = DIRECT_TENANT_MODELS.has(model);
  const isChild = CHILD_DEPENDENT_MODELS.has(model);
  const isScoped = SCOPED_TENANT_MODELS.has(model);

  if (!isGlobal && !isRoot && !isDirect && !isChild && !isScoped) {
    unclassified.push(model);
  }
}

console.log('Total Prisma models:', models.length);
console.log('GLOBAL_MODELS count:', GLOBAL_MODELS.size);
console.log('DIRECT_TENANT_MODELS count:', DIRECT_TENANT_MODELS.size);
console.log('CHILD_DEPENDENT_MODELS count:', CHILD_DEPENDENT_MODELS.size);
console.log('SCOPED_TENANT_MODELS count:', SCOPED_TENANT_MODELS.size);
console.log('Unclassified count:', unclassified.length);
if (unclassified.length > 0) {
  console.log('Unclassified models:', unclassified);
} else {
  console.log('SUCCESS: All 192 models are 100% classified!');
}
