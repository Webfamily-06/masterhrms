-- Non-destructive additive migration for MASTERHRMS Advanced Chat Security, Reliability, Preferences & Distributed Presence
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "edit_history" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "chat_messages_tenant_id_sender_id_client_temp_id_key" ON "chat_messages"("tenant_id", "sender_id", "client_temp_id");
CREATE INDEX IF NOT EXISTS "chat_messages_tenant_id_sender_id_created_at_idx" ON "chat_messages"("tenant_id", "sender_id", "created_at");
CREATE INDEX IF NOT EXISTS "chat_messages_content_fts_idx" ON "chat_messages" USING GIN (to_tsvector('simple', coalesce("content", '')));

ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) NOT NULL DEFAULT 'custom';
ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "source_entity_id" VARCHAR(64);
ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "is_announcement_only" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "max_members" INTEGER NOT NULL DEFAULT 250;
CREATE INDEX IF NOT EXISTS "chat_groups_tenant_id_category_source_entity_id_idx" ON "chat_groups"("tenant_id", "category", "source_entity_id");

CREATE TABLE IF NOT EXISTS "chat_conversation_preferences" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "user_id" VARCHAR(36) NOT NULL,
  "thread_id" VARCHAR(100) NOT NULL,
  "is_muted" BOOLEAN NOT NULL DEFAULT false,
  "muted_until" TIMESTAMP(3),
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "archived_at" TIMESTAMP(3),
  "marked_unread_at" TIMESTAMP(3),
  "notification_level" VARCHAR(20) NOT NULL DEFAULT 'all',
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_conversation_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_conversation_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversation_preferences_tenant_id_user_id_thread_id_key" ON "chat_conversation_preferences"("tenant_id", "user_id", "thread_id");
CREATE INDEX IF NOT EXISTS "chat_conversation_preferences_tenant_id_user_id_idx" ON "chat_conversation_preferences"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "chat_conversation_preferences_tenant_id_user_id_is_archived_idx" ON "chat_conversation_preferences"("tenant_id", "user_id", "is_archived");

CREATE TABLE IF NOT EXISTS "chat_user_presences" (
  "id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36) NOT NULL,
  "user_id" VARCHAR(36) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'online',
  "active_connections" INTEGER NOT NULL DEFAULT 0,
  "instance_id" VARCHAR(64),
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_user_presences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_user_presences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "chat_user_presences_tenant_id_user_id_key" ON "chat_user_presences"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "chat_user_presences_tenant_id_status_last_seen_at_idx" ON "chat_user_presences"("tenant_id", "status", "last_seen_at");

ALTER TABLE "call_history_records" ADD COLUMN IF NOT EXISTS "thread_id" VARCHAR(100);
CREATE INDEX IF NOT EXISTS "call_history_records_tenant_id_thread_id_idx" ON "call_history_records"("tenant_id", "thread_id");

CREATE INDEX IF NOT EXISTS "employees_tenant_id_user_id_idx" ON "employees"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "profiles_tenant_id_user_id_idx" ON "profiles"("tenant_id", "user_id");
