-- Phase C — Wave 3 — Step 3.3.5: Offline Sale Replay Idempotency Key
-- Enforces tenant-scoped uniqueness on sales.invoice_no at the database level.
--
-- Rationale: offline POS queue replays are detected via the stable client identifier
-- (`[OfflineID:<offlineId>]`) stored in sales.invoice_no. A tenant-scoped unique index
-- turns any concurrent or repeated replay into a hard Prisma P2002 failure inside the
-- sale-creation transaction, rolling back BOTH the sale record AND its stock movements,
-- so a replayed queue item can never duplicate physical stock.
--
-- Safety review (per Step 3.3.5 idempotency design):
-- * The pre-existing data in master_hrms_dev was scanned before this migration:
--     SELECT tenant_id, invoice_no, COUNT(*) c FROM sales GROUP BY tenant_id, invoice_no HAVING c > 1;
--   Result: 0 duplicate (tenant_id, invoice_no) pairs. All existing invoice numbers are
--   unique per tenant, so this index cannot reject legitimate historical rows.
-- * Sales created online already populate invoice_no with generated or client-provided
--   receipt numbers; the @@unique([tenantId, invoiceNo]) contract is already declared in
--   the Prisma schema (schema line 2097) but was never materialized as a database index.
-- * No production database is touched by this migration (local master_hrms_dev only).

CREATE UNIQUE INDEX `sales_tenant_id_invoice_no_key`
  ON `sales` (`tenant_id`, `invoice_no`);
