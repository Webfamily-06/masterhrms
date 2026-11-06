const fs = require('fs');

const path = 'server/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

const target = 'nominations          AwardNomination[]';
const replacement = 'nominations          AwardNomination[]\r\n  certificateTemplateAssignments CertificateTemplateAssignment[]';

schema = schema.replace(target, replacement);
fs.writeFileSync(path, schema, 'utf8');
console.log('Added certificateTemplateAssignments to AwardType in server/prisma/schema.prisma');
