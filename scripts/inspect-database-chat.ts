import { rawPrisma } from "../server/src/prisma";

async function run() {
  console.log("=== SUPABASE POSTGRESQL READ-ONLY INSPECTION ===");

  // 1. Row counts
  const tables = [
    "chat_messages",
    "chat_groups",
    "chat_group_members",
    "chat_read_receipts",
    "chat_conversation_pins",
    "calls",
    "call_participants",
    "call_events",
    "call_history_records",
    "media_files",
    "file_acls",
    "outbox_events",
    "notifications",
  ];

  console.log("\n--- TABLE ROW COUNTS ---");
  const counts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const res: any = await rawPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      counts[table] = res[0].count;
      console.log(`  ${table}: ${res[0].count}`);
    } catch (err: any) {
      console.log(`  ${table}: ERROR - ${err.message}`);
    }
  }

  // 2. ChatMessage Columns & Idempotency
  console.log("\n--- CHAT_MESSAGES COLUMNS ---");
  const msgCols: any = await rawPrisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name IN ('client_temp_id', 'edit_history', 'deleted_by', 'is_deleted_for_everyone')
    ORDER BY column_name;
  `);
  console.table(msgCols);

  // 3. Constraints on chat_messages
  console.log("\n--- CHAT_MESSAGES UNIQUE CONSTRAINTS & INDEXES ---");
  const msgIndexes: any = await rawPrisma.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'chat_messages'
    ORDER BY indexname;
  `);
  for (const idx of msgIndexes) {
    console.log(`  ${idx.indexname}: ${idx.indexdef}`);
  }

  // 4. ChatConversationPreference and ChatUserPresence tables
  console.log("\n--- NEW CHAT TABLES EXISTENCE ---");
  const newTables: any = await rawPrisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('chat_conversation_preferences', 'chat_user_presence');
  `);
  console.table(newTables);

  // 5. CallHistoryRecord.threadId
  console.log("\n--- CALL_HISTORY_RECORDS THREAD_ID COLUMN ---");
  const callCols: any = await rawPrisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'call_history_records' AND column_name = 'thread_id';
  `);
  console.table(callCols);

  // 6. Migration history check
  console.log("\n--- PRISMA MIGRATIONS TABLE ---");
  try {
    const migs: any = await rawPrisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC
      LIMIT 10;
    `);
    console.table(migs);
  } catch (err: any) {
    console.log("  _prisma_migrations:", err.message);
  }

  await rawPrisma.$disconnect();
}

run().catch((err) => {
  console.error("Error inspecting database:", err);
  process.exit(1);
});
