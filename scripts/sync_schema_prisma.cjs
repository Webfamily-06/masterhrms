const fs = require('fs');

const path = 'server/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

// 1. Add relations to MediaFile
if (!schema.includes('brandingAssets          OrganizationBrandingAsset[]')) {
  schema = schema.replace(
    'usages      MediaUsage[]',
    'usages      MediaUsage[]\r\n  brandingAssets          OrganizationBrandingAsset[]\r\n  employeeCertificates    EmployeeAwardCertificate[]'
  );
  if (!schema.includes('brandingAssets          OrganizationBrandingAsset[]')) {
    schema = schema.replace(
      'usages      MediaUsage[]',
      'usages      MediaUsage[]\n  brandingAssets          OrganizationBrandingAsset[]\n  employeeCertificates    EmployeeAwardCertificate[]'
    );
  }
}

// 2. Add fileId to EmployeeAwardCertificate
if (!schema.includes('fileId            String?')) {
  schema = schema.replace(
    'storagePath       String           @map("storage_path") @db.VarChar(500)',
    'storagePath       String           @map("storage_path") @db.VarChar(500)\r\n  fileId            String?          @map("file_id") @db.VarChar(36)'
  );
  if (!schema.includes('fileId            String?')) {
    schema = schema.replace(
      'storagePath       String           @map("storage_path") @db.VarChar(500)',
      'storagePath       String           @map("storage_path") @db.VarChar(500)\n  fileId            String?          @map("file_id") @db.VarChar(36)'
    );
  }

  schema = schema.replace(
    'nomination        AwardNomination? @relation(fields: [nominationId], references: [id], onDelete: SetNull)',
    'nomination        AwardNomination? @relation(fields: [nominationId], references: [id], onDelete: SetNull)\r\n  file              MediaFile?       @relation(fields: [fileId], references: [id], onDelete: SetNull)'
  );
  if (!schema.includes('file              MediaFile?')) {
    schema = schema.replace(
      'nomination        AwardNomination? @relation(fields: [nominationId], references: [id], onDelete: SetNull)',
      'nomination        AwardNomination? @relation(fields: [nominationId], references: [id], onDelete: SetNull)\n  file              MediaFile?       @relation(fields: [fileId], references: [id], onDelete: SetNull)'
    );
  }
}

// 3. Add Certificate Studio models if missing in server/prisma/schema.prisma
if (!schema.includes('model OrganizationBrandingAsset')) {
  const modelsBlock = `
model OrganizationBrandingAsset {
  id          String   @id @default(uuid()) @db.VarChar(36)
  tenantId    String   @map("tenant_id") @db.VarChar(36)
  assetType   String   @map("asset_type") @db.VarChar(50)
  assetName   String   @map("asset_name") @db.VarChar(200)
  storagePath String   @map("storage_path") @db.VarChar(500)
  mimeType    String   @map("mime_type") @db.VarChar(100)
  fileSize    Int      @default(0) @map("file_size")
  metadata    Json?    @default("{}")
  version     Int      @default(1)
  isActive    Boolean  @default(true) @map("is_active")
  fileId      String?  @map("file_id") @db.VarChar(36)
  createdBy   String?  @map("created_by") @db.VarChar(36)
  updatedBy   String?  @map("updated_by") @db.VarChar(36)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tenant           Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  signatories      OrganizationSignatory[]
  templateVersions CertificateTemplateVersion[]
  file             MediaFile?                   @relation(fields: [fileId], references: [id], onDelete: SetNull)

  @@index([tenantId, assetType, isActive])
  @@index([tenantId, fileId])
  @@map("organization_branding_assets")
}

model OrganizationSignatory {
  id                  String    @id @default(uuid()) @db.VarChar(36)
  tenantId            String    @map("tenant_id") @db.VarChar(36)
  name                String    @db.VarChar(150)
  designation         String    @db.VarChar(150)
  department          String?   @db.VarChar(150)
  signatureAssetId    String?   @map("signature_asset_id") @db.VarChar(36)
  signatoryType       String    @default("HR_MANAGER") @map("signatory_type") @db.VarChar(50)
  authorizationStatus String    @default("PENDING") @map("authorization_status") @db.VarChar(30)
  effectiveFrom       DateTime  @default(now()) @map("effective_from")
  effectiveTo         DateTime? @map("effective_to")
  isActive            Boolean   @default(true) @map("is_active")
  createdBy           String?   @map("created_by") @db.VarChar(36)
  updatedBy           String?   @map("updated_by") @db.VarChar(36)
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  tenant         Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  signatureAsset OrganizationBrandingAsset? @relation(fields: [signatureAssetId], references: [id], onDelete: SetNull)

  @@index([tenantId, authorizationStatus, isActive])
  @@map("organization_signatories")
}

model CertificateTemplate {
  id                        String   @id @default(uuid()) @db.VarChar(36)
  tenantId                  String?  @map("tenant_id") @db.VarChar(36)
  name                      String   @db.VarChar(200)
  description               String?
  category                  String   @db.VarChar(100)
  tags                      Json?    @default("[]")
  templateType              String   @default("VISUAL_DESIGNER") @map("template_type") @db.VarChar(50)
  pageSize                  String   @default("A4") @map("page_size") @db.VarChar(20)
  orientation               String   @default("LANDSCAPE") @db.VarChar(20)
  status                    String   @default("DRAFT") @db.VarChar(30)
  isSystem                  Boolean  @default(false) @map("is_system")
  thumbnailUrl              String?  @map("thumbnail_url") @db.VarChar(500)
  currentPublishedVersionId String?  @map("current_published_version_id") @db.VarChar(36)
  createdBy                 String?  @map("created_by") @db.VarChar(36)
  updatedBy                 String?  @map("updated_by") @db.VarChar(36)
  createdAt                 DateTime @default(now()) @map("created_at")
  updatedAt                 DateTime @updatedAt @map("updated_at")

  tenant      Tenant?                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  versions    CertificateTemplateVersion[]
  assignments CertificateTemplateAssignment[]

  @@index([tenantId, category, status])
  @@index([isSystem, status])
  @@map("certificate_templates")
}

model CertificateTemplateVersion {
  id                String    @id @default(uuid()) @db.VarChar(36)
  templateId        String    @map("template_id") @db.VarChar(36)
  versionNumber     Int       @default(1) @map("version_number")
  designJson        Json      @default("{}") @map("design_json")
  htmlContent       String?   @map("html_content")
  cssContent        String?   @map("css_content")
  backgroundAssetId String?   @map("background_asset_id") @db.VarChar(36)
  placeholderSchema Json?     @default("[]") @map("placeholder_schema")
  validationStatus  String    @default("VALIDATED") @map("validation_status") @db.VarChar(30)
  publishedAt       DateTime? @map("published_at")
  createdBy         String?   @map("created_by") @db.VarChar(36)
  createdAt         DateTime  @default(now()) @map("created_at")

  template        CertificateTemplate             @relation(fields: [templateId], references: [id], onDelete: Cascade)
  backgroundAsset OrganizationBrandingAsset?      @relation(fields: [backgroundAssetId], references: [id], onDelete: SetNull)
  assignments     CertificateTemplateAssignment[]

  @@index([templateId, versionNumber])
  @@map("certificate_template_versions")
}

model CertificateTemplateAssignment {
  id                     String   @id @default(uuid()) @db.VarChar(36)
  tenantId               String   @map("tenant_id") @db.VarChar(36)
  awardTypeId            String   @map("award_type_id") @db.VarChar(36)
  templateId             String   @map("template_id") @db.VarChar(36)
  templateVersionId      String?  @map("template_version_id") @db.VarChar(36)
  signatoryConfiguration Json?    @default("{}") @map("signatory_configuration")
  isDefault              Boolean  @default(false) @map("is_default")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  tenant          Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  awardType       AwardType                   @relation(fields: [awardTypeId], references: [id], onDelete: Cascade)
  template        CertificateTemplate         @relation(fields: [templateId], references: [id], onDelete: Restrict)
  templateVersion CertificateTemplateVersion? @relation(fields: [templateVersionId], references: [id], onDelete: SetNull)

  @@unique([tenantId, awardTypeId])
  @@index([tenantId, isDefault])
  @@map("certificate_template_assignments")
}

model CertificateAuditLog {
  id            String   @id @default(uuid()) @db.VarChar(36)
  tenantId      String   @map("tenant_id") @db.VarChar(36)
  certificateId String?  @map("certificate_id") @db.VarChar(36)
  templateId    String?  @map("template_id") @db.VarChar(36)
  actorId       String   @map("actor_id") @db.VarChar(36)
  eventType     String   @map("event_type") @db.VarChar(100)
  metadata      Json?    @default("{}")
  createdAt     DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, eventType, createdAt])
  @@map("certificate_audit_logs")
}
`;

  schema = schema.replace(
    'model WarningType {',
    modelsBlock + '\r\nmodel WarningType {'
  );
  if (!schema.includes('model OrganizationBrandingAsset')) {
    schema = schema.replace(
      'model WarningType {',
      modelsBlock + '\nmodel WarningType {'
    );
  }
}

// Also add to Tenant model relations
if (!schema.includes('organizationBrandingAssets     OrganizationBrandingAsset[]')) {
  schema = schema.replace(
    'employeeAwardCertificates      EmployeeAwardCertificate[]',
    'employeeAwardCertificates      EmployeeAwardCertificate[]\r\n  organizationBrandingAssets     OrganizationBrandingAsset[]\r\n  organizationSignatories        OrganizationSignatory[]\r\n  certificateTemplates           CertificateTemplate[]\r\n  certificateTemplateAssignments CertificateTemplateAssignment[]\r\n  certificateAuditLogs           CertificateAuditLog[]'
  );
  if (!schema.includes('organizationBrandingAssets     OrganizationBrandingAsset[]')) {
    schema = schema.replace(
      'employeeAwardCertificates      EmployeeAwardCertificate[]',
      'employeeAwardCertificates      EmployeeAwardCertificate[]\n  organizationBrandingAssets     OrganizationBrandingAsset[]\n  organizationSignatories        OrganizationSignatory[]\n  certificateTemplates           CertificateTemplate[]\n  certificateTemplateAssignments CertificateTemplateAssignment[]\n  certificateAuditLogs           CertificateAuditLog[]'
    );
  }
}

fs.writeFileSync(path, schema, 'utf8');
console.log('Successfully updated server/prisma/schema.prisma');
