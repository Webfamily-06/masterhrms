-- Migration: 20261104100000_aud_conc_002_idempotency_constraints (PostgreSQL 17.11 compatible)
-- Enforces hard database-level idempotency for payroll accounting and loan deduction workflows

-- Preflight: Ensure no invalid or incompatible indexes exist under constraint names
DO $$
DECLARE
    is_valid BOOLEAN;
    idx_def TEXT;
BEGIN
    -- Check 1: uq_journal_entries_tenant_payroll_run
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_journal_entries_tenant_payroll_run') THEN
        SELECT i.indisvalid, pg_get_indexdef(i.indexrelid) INTO is_valid, idx_def
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'uq_journal_entries_tenant_payroll_run';

        IF NOT is_valid THEN
            RAISE EXCEPTION 'Existing index "uq_journal_entries_tenant_payroll_run" is INVALID (indisvalid=false). Manual remediation required.';
        END IF;

        IF idx_def NOT LIKE '%(tenant_id, reference)%' OR idx_def NOT LIKE '%payroll%' THEN
            RAISE EXCEPTION 'Existing index "uq_journal_entries_tenant_payroll_run" has incompatible definition: %', idx_def;
        END IF;
    END IF;

    -- Check 2: uq_loan_installments_loan_payroll_run
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_loan_installments_loan_payroll_run') THEN
        SELECT i.indisvalid, pg_get_indexdef(i.indexrelid) INTO is_valid, idx_def
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'uq_loan_installments_loan_payroll_run';

        IF NOT is_valid THEN
            RAISE EXCEPTION 'Existing index "uq_loan_installments_loan_payroll_run" is INVALID (indisvalid=false). Manual remediation required.';
        END IF;

        IF idx_def NOT LIKE '%(loan_id, payroll_run_id)%' THEN
            RAISE EXCEPTION 'Existing index "uq_loan_installments_loan_payroll_run" has incompatible definition: %', idx_def;
        END IF;
    END IF;
END $$;

-- 1. General Ledger Single-Posting Constraint per Payroll Run
-- Guarantees that a tenant can have at most one General Ledger journal entry for a given payroll run reference.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_journal_entries_tenant_payroll_run"
ON "journal_entries" ("tenant_id", "reference")
WHERE "reference" IS NOT NULL AND "reference_type" = 'payroll';

-- 2. Employee Loan Installment Deduction Idempotency Constraint
-- Guarantees that a given loan can only have one deduction installment linked to a specific payroll run.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_loan_installments_loan_payroll_run"
ON "loan_installments" ("loan_id", "payroll_run_id")
WHERE "payroll_run_id" IS NOT NULL;
