const fs = require('fs');

const path = 'server/src/config/tenant-models.config.ts';
let content = fs.readFileSync(path, 'utf8');

const target = '  "EmployeeAwardCertificate",';
const replacement = `  "EmployeeAwardCertificate",
  "OrganizationBrandingAsset",
  "OrganizationSignatory",
  "CertificateTemplate",
  "CertificateTemplateVersion",
  "CertificateTemplateAssignment",
  "CertificateAuditLog",`;

if (!content.includes('"OrganizationBrandingAsset",')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Added Certificate Studio models to DIRECT_TENANT_MODELS');
}
