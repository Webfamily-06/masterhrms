const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('================================================================');
  console.log('MASTERHRMS: ENTERPRISE CERTIFICATE DESIGN STUDIO SCHEMA MIGRATION');
  console.log('================================================================\n');

  try {
    // 1. Organization Branding Assets
    console.log('1. Creating organization_branding_assets table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "organization_branding_assets" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenant_id" VARCHAR(36) NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "asset_type" VARCHAR(50) NOT NULL,
        "asset_name" VARCHAR(200) NOT NULL,
        "storage_path" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size" INTEGER NOT NULL DEFAULT 0,
        "metadata" JSONB DEFAULT '{}'::jsonb,
        "version" INTEGER NOT NULL DEFAULT 1,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" VARCHAR(36),
        "updated_by" VARCHAR(36),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_branding_tenant_type" 
      ON "organization_branding_assets"("tenant_id", "asset_type", "is_active");
    `);

    // 2. Organization Signatories
    console.log('2. Creating organization_signatories table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "organization_signatories" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenant_id" VARCHAR(36) NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" VARCHAR(150) NOT NULL,
        "designation" VARCHAR(150) NOT NULL,
        "department" VARCHAR(150),
        "signature_asset_id" VARCHAR(36) REFERENCES "organization_branding_assets"("id") ON DELETE SET NULL,
        "signatory_type" VARCHAR(50) NOT NULL DEFAULT 'HR_MANAGER',
        "authorization_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "effective_to" TIMESTAMPTZ,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" VARCHAR(36),
        "updated_by" VARCHAR(36),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_signatories_tenant_auth" 
      ON "organization_signatories"("tenant_id", "authorization_status", "is_active");
    `);

    // 3. Certificate Templates (System templates have tenant_id NULL)
    console.log('3. Creating certificate_templates table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "certificate_templates" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenant_id" VARCHAR(36) REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "category" VARCHAR(100) NOT NULL,
        "tags" JSONB DEFAULT '[]'::jsonb,
        "template_type" VARCHAR(50) NOT NULL DEFAULT 'VISUAL_DESIGNER',
        "page_size" VARCHAR(20) NOT NULL DEFAULT 'A4',
        "orientation" VARCHAR(20) NOT NULL DEFAULT 'LANDSCAPE',
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "is_system" BOOLEAN NOT NULL DEFAULT false,
        "thumbnail_url" VARCHAR(500),
        "current_published_version_id" VARCHAR(36),
        "created_by" VARCHAR(36),
        "updated_by" VARCHAR(36),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_templates_tenant_cat" 
      ON "certificate_templates"("tenant_id", "category", "status");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_templates_system" 
      ON "certificate_templates"("is_system", "status");
    `);

    // 4. Certificate Template Versions
    console.log('4. Creating certificate_template_versions table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "certificate_template_versions" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "template_id" VARCHAR(36) NOT NULL REFERENCES "certificate_templates"("id") ON DELETE CASCADE,
        "version_number" INTEGER NOT NULL DEFAULT 1,
        "design_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "html_content" TEXT,
        "css_content" TEXT,
        "background_asset_id" VARCHAR(36) REFERENCES "organization_branding_assets"("id") ON DELETE SET NULL,
        "placeholder_schema" JSONB DEFAULT '[]'::jsonb,
        "validation_status" VARCHAR(30) NOT NULL DEFAULT 'VALIDATED',
        "published_at" TIMESTAMPTZ,
        "created_by" VARCHAR(36),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_versions_template" 
      ON "certificate_template_versions"("template_id", "version_number");
    `);

    // 5. Certificate Template Assignments
    console.log('5. Creating certificate_template_assignments table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "certificate_template_assignments" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenant_id" VARCHAR(36) NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "award_type_id" VARCHAR(36) NOT NULL REFERENCES "award_types"("id") ON DELETE CASCADE,
        "template_id" VARCHAR(36) NOT NULL REFERENCES "certificate_templates"("id") ON DELETE RESTRICT,
        "template_version_id" VARCHAR(36) REFERENCES "certificate_template_versions"("id") ON DELETE SET NULL,
        "signatory_configuration" JSONB DEFAULT '{}'::jsonb,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_cert_assign_tenant_award_type" UNIQUE ("tenant_id", "award_type_id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_assign_tenant" 
      ON "certificate_template_assignments"("tenant_id", "is_default");
    `);

    // 6. Certificate Audit Logs
    console.log('6. Creating certificate_audit_logs table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "certificate_audit_logs" (
        "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenant_id" VARCHAR(36) NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "certificate_id" VARCHAR(36),
        "template_id" VARCHAR(36),
        "actor_id" VARCHAR(36) NOT NULL,
        "event_type" VARCHAR(100) NOT NULL,
        "metadata" JSONB DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_cert_audit_tenant_event" 
      ON "certificate_audit_logs"("tenant_id", "event_type", "created_at");
    `);

    // 7. Add additive columns to employee_award_certificates
    console.log('7. Adding additive columns to employee_award_certificates...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "employee_award_certificates" 
      ADD COLUMN IF NOT EXISTS "template_id" VARCHAR(36),
      ADD COLUMN IF NOT EXISTS "template_version_id" VARCHAR(36),
      ADD COLUMN IF NOT EXISTS "snapshot_data" JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('\n✔ All tables, constraints, and additive columns created successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration().catch(process.exit.bind(process, 1));
