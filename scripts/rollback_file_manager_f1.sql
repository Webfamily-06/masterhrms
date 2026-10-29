-- ========================================================
-- MASTERHRMS FILE MANAGER — PHASE F1 ROLLBACK SCRIPT
-- ========================================================

DROP TABLE IF EXISTS file_shares CASCADE;
DROP TABLE IF EXISTS file_stars CASCADE;

ALTER TABLE media_files DROP CONSTRAINT IF EXISTS fk_media_files_parent;

DROP INDEX IF EXISTS idx_media_files_tenant_parent;
DROP INDEX IF EXISTS idx_media_files_tenant_is_folder;

ALTER TABLE media_files DROP COLUMN IF EXISTS parent_id;
ALTER TABLE media_files DROP COLUMN IF EXISTS is_folder;
ALTER TABLE media_files DROP COLUMN IF EXISTS category;
ALTER TABLE media_files DROP COLUMN IF EXISTS original_folder;

