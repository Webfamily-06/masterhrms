const fs = require('fs');

const path = 'server/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

const target = 'metadata          Json';
const replacement = `metadata          Json
  templateId        String?          @map("template_id") @db.VarChar(36)
  templateVersionId String?          @map("template_version_id") @db.VarChar(36)
  snapshotData      Json?            @default("{}") @map("snapshot_data")`;

if (!schema.includes('templateId        String?')) {
  schema = schema.replace(target, replacement);
  fs.writeFileSync(path, schema, 'utf8');
  console.log('Added templateId, templateVersionId, snapshotData to EmployeeAwardCertificate');
}
