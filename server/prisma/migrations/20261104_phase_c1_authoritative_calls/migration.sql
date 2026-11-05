-- Phase C1: Authoritative Call State Machine & Lifecycle (Additive & Reversible)
-- Preserves existing call_history_records and all prior tables.

CREATE TABLE IF NOT EXISTS "calls" (
    "id" VARCHAR(36) NOT NULL,
    "tenant_id" VARCHAR(36) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'DIRECT',
    "media" VARCHAR(20) NOT NULL DEFAULT 'AUDIO',
    "status" VARCHAR(20) NOT NULL DEFAULT 'RINGING',
    "started_by" VARCHAR(36) NOT NULL,
    "room_key" VARCHAR(100) NOT NULL,
    "group_id" VARCHAR(36),
    "thread_id" VARCHAR(100),
    "history_record_id" VARCHAR(36),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringing_expires_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "end_reason" VARCHAR(50),
    "max_participants" INTEGER NOT NULL DEFAULT 2,
    "metadata" JSONB,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calls_room_key_key" ON "calls"("room_key");
CREATE INDEX IF NOT EXISTS "calls_tenant_id_status_idx" ON "calls"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "calls_tenant_id_started_at_idx" ON "calls"("tenant_id", "started_at");
CREATE INDEX IF NOT EXISTS "calls_status_ringing_expires_at_idx" ON "calls"("status", "ringing_expires_at");

CREATE TABLE IF NOT EXISTS "call_participants" (
    "id" VARCHAR(36) NOT NULL,
    "call_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    "role" VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "leave_reason" VARCHAR(50),
    "reconnect_grace_expires_at" TIMESTAMP(3),

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "call_participants_call_id_user_id_key" ON "call_participants"("call_id", "user_id");
CREATE INDEX IF NOT EXISTS "call_participants_user_id_state_idx" ON "call_participants"("user_id", "state");
CREATE INDEX IF NOT EXISTS "call_participants_state_reconnect_grace_expires_at_idx" ON "call_participants"("state", "reconnect_grace_expires_at");

CREATE TABLE IF NOT EXISTS "call_events" (
    "id" VARCHAR(36) NOT NULL,
    "call_id" VARCHAR(36) NOT NULL,
    "actor_id" VARCHAR(36) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_events_call_id_created_at_idx" ON "call_events"("call_id", "created_at");

-- Safe Foreign Key Attachment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'calls_tenant_id_fkey'
    ) THEN
        ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_participants_call_id_fkey'
    ) THEN
        ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'call_events_call_id_fkey'
    ) THEN
        ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

