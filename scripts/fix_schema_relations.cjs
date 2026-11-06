const fs = require('fs');

const path = 'server/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

// 1. Add to Tenant
if (!schema.includes('organizationBrandingAssets     OrganizationBrandingAsset[]')) {
  schema = schema.replace(
    'awardCertificates            EmployeeAwardCertificate[]',
    'awardCertificates            EmployeeAwardCertificate[]\r\n  organizationBrandingAssets     OrganizationBrandingAsset[]\r\n  organizationSignatories        OrganizationSignatory[]\r\n  certificateTemplates           CertificateTemplate[]\r\n  certificateTemplateAssignments CertificateTemplateAssignment[]\r\n  certificateAuditLogs           CertificateAuditLog[]'
  );
  if (!schema.includes('organizationBrandingAssets     OrganizationBrandingAsset[]')) {
    schema = schema.replace(
      'awardCertificates            EmployeeAwardCertificate[]',
      'awardCertificates            EmployeeAwardCertificate[]\n  organizationBrandingAssets     OrganizationBrandingAsset[]\n  organizationSignatories        OrganizationSignatory[]\n  certificateTemplates           CertificateTemplate[]\n  certificateTemplateAssignments CertificateTemplateAssignment[]\n  certificateAuditLogs           CertificateAuditLog[]'
    );
  }
}

// 2. Add to AwardType
if (!schema.includes('certificateTemplateAssignments CertificateTemplateAssignment[]')) {
  schema = schema.replace(
    'nominations          AwardNomination[]',
    'nominations          AwardNomination[]\r\n  certificateTemplateAssignments CertificateTemplateAssignment[]'
  );
  if (!schema.includes('certificateTemplateAssignments CertificateTemplateAssignment[]')) {
    schema = schema.replace(
      'nominations          AwardNomination[]',
      'nominations          AwardNomination[]\n  certificateTemplateAssignments CertificateTemplateAssignment[]'
    );
  }
}

fs.writeFileSync(path, schema, 'utf8');
console.log('Updated relations in Tenant and AwardType');
