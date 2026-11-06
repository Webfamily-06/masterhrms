const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CREATING DEVICE_SESSIONS TABLE IF NOT EXISTS ===");
  const statements = [
    `CREATE TABLE IF NOT EXISTS device_sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE SET NULL,
      device_name VARCHAR(255),
      device_type VARCHAR(50) DEFAULT 'desktop',
      browser VARCHAR(100),
      operating_system VARCHAR(100),
      ip_address VARCHAR(45),
      country VARCHAR(100),
      city VARCHAR(100),
      user_agent TEXT,
      refresh_token_hash VARCHAR(255),
      last_active_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      revoked_at TIMESTAMP WITH TIME ZONE,
      revoked BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_device_sessions_user_revoked ON device_sessions(user_id, revoked);`,
    `CREATE INDEX IF NOT EXISTS idx_device_sessions_tenant_id ON device_sessions(tenant_id);`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("[OK] device_sessions table and indexes created or verified successfully.");
}

main()
  .catch((e) => {
    console.error("Migration error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
