const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying non-destructive Wave 2.1 schema additions...');

  // 1. stored_documents table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS stored_documents (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      storage_key VARCHAR(255) NOT NULL UNIQUE,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size_bytes INT NOT NULL,
      sha256_hash VARCHAR(64) NOT NULL,
      is_encrypted BOOLEAN NOT NULL DEFAULT TRUE,
      encryption_algo VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(36) NULL,
      uploaded_by_id VARCHAR(36) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_stored_docs_tenant_entity (tenant_id, entity_type, entity_id),
      INDEX idx_stored_docs_tenant_hash (tenant_id, sha256_hash),
      CONSTRAINT fk_stored_docs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✔ stored_documents table ready');

  // 2. expense_claims columns
  const cols = [
    ['receipt_hash', 'VARCHAR(64) NULL'],
    ['receipt_path', 'VARCHAR(500) NULL'],
    ['receipt_mime', 'VARCHAR(100) NULL'],
    ['receipt_size', 'INT NULL'],
    ['ocr_extracted', 'JSON NULL'],
    ['ocr_confidence', 'DECIMAL(5, 2) NULL'],
    ['ocr_status', "VARCHAR(30) DEFAULT 'not_processed'"],
    ['is_duplicate_warning', 'BOOLEAN DEFAULT FALSE'],
    ['stored_document_id', 'VARCHAR(36) NULL'],
  ];

  for (const [col, def] of cols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE expense_claims ADD COLUMN ${col} ${def};`);
      console.log('✔ Added column', col);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log('ℹ Column already exists:', col);
      } else {
        console.warn('Column add notice:', col, e.message);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
