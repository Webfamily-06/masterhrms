const fs = require('fs');
const path = 'server/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

const needle = 'model Branch {\n';
const needleCRLF = 'model Branch {\r\n';

if (content.includes('latitude') && content.includes('geofenceRadius')) {
  console.log('Branch geofence fields already present');
  process.exit(0);
}

const replacement = `  latitude            Float?               @map("latitude")\n  longitude           Float?               @map("longitude")\n  geofenceRadius      Int?                 @default(500) @map("geofence_radius")\n`;
const replacementCRLF = `  latitude            Float?               @map("latitude")\r\n  longitude           Float?               @map("longitude")\r\n  geofenceRadius      Int?                 @default(500) @map("geofence_radius")\r\n`;

if (content.includes('  email               String?              @db.VarChar(255)\r\n  status              String')) {
  content = content.replace(
    '  email               String?              @db.VarChar(255)\r\n  status              String',
    '  email               String?              @db.VarChar(255)\r\n' + replacementCRLF + '  status              String'
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully added Branch geofencing fields (CRLF)');
} else if (content.includes('  email               String?              @db.VarChar(255)\n  status              String')) {
  content = content.replace(
    '  email               String?              @db.VarChar(255)\n  status              String',
    '  email               String?              @db.VarChar(255)\n' + replacement + '  status              String'
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully added Branch geofencing fields (LF)');
} else {
  console.error('Target pattern in Branch not found');
  process.exit(1);
}

