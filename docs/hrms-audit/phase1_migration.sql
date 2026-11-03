-- DropForeignKey
ALTER TABLE "dlp_findings" DROP CONSTRAINT "dlp_findings_file_id_fkey";

-- DropForeignKey
ALTER TABLE "dlp_findings" DROP CONSTRAINT "dlp_findings_policy_id_fkey";

-- DropForeignKey
ALTER TABLE "document_annotation_replies" DROP CONSTRAINT "document_annotation_replies_annotation_id_fkey";

-- DropForeignKey
ALTER TABLE "document_annotations" DROP CONSTRAINT "document_annotations_file_id_fkey";

-- DropForeignKey
ALTER TABLE "external_sync_conflicts" DROP CONSTRAINT "external_sync_conflicts_connection_id_fkey";

-- DropForeignKey
ALTER TABLE "external_sync_conflicts" DROP CONSTRAINT "external_sync_conflicts_file_id_fkey";

-- DropForeignKey
ALTER TABLE "file_scan_jobs" DROP CONSTRAINT "file_scan_jobs_file_id_fkey";

-- DropForeignKey
ALTER TABLE "media_files" DROP CONSTRAINT "media_files_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "storage_legal_holds" DROP CONSTRAINT "storage_legal_holds_file_id_fkey";

-- DropIndex
DROP INDEX "idx_file_links_file_id";

-- DropIndex
DROP INDEX "idx_media_files_scan_status";

-- DropIndex
DROP INDEX "idx_media_files_storage_calc";

-- DropIndex
DROP INDEX "idx_media_files_system_module";

-- DropIndex
DROP INDEX "idx_media_files_tenant_is_public";

-- AlterTable
ALTER TABLE "archive_jobs" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_categories" ALTER COLUMN "icon" SET DEFAULT 'ðŸ’»';

-- AlterTable
ALTER TABLE "dlp_findings" ALTER COLUMN "reviewed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "dlp_policies" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_annotation_replies" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_annotations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "address_line1" VARCHAR(255),
ADD COLUMN     "address_line2" VARCHAR(255),
ADD COLUMN     "blood_group" VARCHAR(10),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "completion_480_days_date" DATE,
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "emergency_contact_name" VARCHAR(100),
ADD COLUMN     "emergency_contact_phone" VARCHAR(30),
ADD COLUMN     "emergency_contact_relationship" VARCHAR(50),
ADD COLUMN     "father_or_spouse_name" VARCHAR(150),
ADD COLUMN     "marital_status" VARCHAR(20),
ADD COLUMN     "maternity_nomination_date" DATE,
ADD COLUMN     "permanent_address" TEXT,
ADD COLUMN     "permanent_employment_date" DATE,
ADD COLUMN     "postal_code" VARCHAR(20),
ADD COLUMN     "present_address" TEXT,
ADD COLUMN     "worker_age_classification" VARCHAR(20) NOT NULL DEFAULT 'Adult';

-- AlterTable
ALTER TABLE "external_storage_connections" ALTER COLUMN "token_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_synced_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "external_sync_conflicts" ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "file_scan_jobs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "days" SET DEFAULT 1.0,
ALTER COLUMN "days" SET DATA TYPE DECIMAL(4,1);

-- AlterTable
ALTER TABLE "media_files" ALTER COLUMN "file_size" SET DATA TYPE INTEGER,
ALTER COLUMN "scanned_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "quarantined_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "quarantine_released_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "storage_retention_policies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webdav_tokens" ALTER COLUMN "last_used_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "tenant_id" VARCHAR(36),
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50) NOT NULL DEFAULT 'desktop',
    "browser" VARCHAR(100),
    "operating_system" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "user_agent" TEXT,
    "refresh_token_hash" VARCHAR(255),
    "last_active_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_sessions_user_id_idx" ON "device_sessions"("user_id");

-- CreateIndex
CREATE INDEX "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");

-- CreateIndex
CREATE INDEX "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_legal_holds" ADD CONSTRAINT "storage_legal_holds_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "media_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "media_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_annotation_replies" ADD CONSTRAINT "document_annotation_replies_annotation_id_fkey" FOREIGN KEY ("annotation_id") REFERENCES "document_annotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_scan_jobs" ADD CONSTRAINT "file_scan_jobs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "media_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dlp_findings" ADD CONSTRAINT "dlp_findings_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "media_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dlp_findings" ADD CONSTRAINT "dlp_findings_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "dlp_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sync_conflicts" ADD CONSTRAINT "external_sync_conflicts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "external_storage_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sync_conflicts" ADD CONSTRAINT "external_sync_conflicts_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_archive_jobs_token" RENAME TO "archive_jobs_download_token_idx";

-- RenameIndex
ALTER INDEX "idx_archive_jobs_user" RENAME TO "archive_jobs_tenant_id_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_dlp_findings_file" RENAME TO "dlp_findings_tenant_id_file_id_idx";

-- RenameIndex
ALTER INDEX "idx_dlp_findings_sev" RENAME TO "dlp_findings_tenant_id_severity_idx";

-- RenameIndex
ALTER INDEX "idx_dlp_findings_status" RENAME TO "dlp_findings_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "idx_dlp_policies_tenant" RENAME TO "dlp_policies_tenant_id_is_enabled_idx";

-- RenameIndex
ALTER INDEX "idx_doc_annot_replies_annot" RENAME TO "document_annotation_replies_annotation_id_idx";

-- RenameIndex
ALTER INDEX "idx_doc_annot_replies_user" RENAME TO "document_annotation_replies_tenant_id_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_doc_annot_author" RENAME TO "document_annotations_tenant_id_created_by_idx";

-- RenameIndex
ALTER INDEX "idx_doc_annot_file" RENAME TO "document_annotations_tenant_id_file_id_file_version_idx";

-- RenameIndex
ALTER INDEX "idx_ext_conn_prov" RENAME TO "external_storage_connections_tenant_id_provider_idx";

-- RenameIndex
ALTER INDEX "idx_ext_conn_status" RENAME TO "external_storage_connections_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "idx_sync_conflicts_conn" RENAME TO "external_sync_conflicts_tenant_id_connection_id_idx";

-- RenameIndex
ALTER INDEX "idx_sync_conflicts_res" RENAME TO "external_sync_conflicts_tenant_id_resolution_idx";

-- RenameIndex
ALTER INDEX "idx_file_scan_jobs_file" RENAME TO "file_scan_jobs_tenant_id_file_id_idx";

-- RenameIndex
ALTER INDEX "idx_file_scan_jobs_status" RENAME TO "file_scan_jobs_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "idx_webdav_tokens_hash" RENAME TO "webdav_tokens_token_hash_idx";

-- RenameIndex
ALTER INDEX "idx_webdav_tokens_user" RENAME TO "webdav_tokens_tenant_id_user_id_idx";
